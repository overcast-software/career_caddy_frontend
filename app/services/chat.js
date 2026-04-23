import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';

// Kept across phases 3 → 4: the agent still emits <!-- navigate:/path -->
// markers inside text content until the system prompt edit in phase 4
// replaces them with propose_actions navigate buttons.
const NAVIGATE_RE = /<!--\s*navigate:(\/[^\s]*)\s*-->/g;

// AG-UI event type strings (see pydantic-ai chat_server.py + ag_ui.core.events).
const AG_UI = {
  RUN_STARTED: 'RUN_STARTED',
  RUN_FINISHED: 'RUN_FINISHED',
  RUN_ERROR: 'RUN_ERROR',
  TEXT_MESSAGE_START: 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT: 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END: 'TEXT_MESSAGE_END',
  TOOL_CALL_START: 'TOOL_CALL_START',
  TOOL_CALL_ARGS: 'TOOL_CALL_ARGS',
  TOOL_CALL_END: 'TOOL_CALL_END',
  TOOL_CALL_RESULT: 'TOOL_CALL_RESULT',
  CUSTOM: 'CUSTOM',
};

export default class ChatService extends Service {
  @service router;
  @service session;
  @service store;
  @service poller;
  @service onboarding;

  @tracked messages = [];
  @tracked isStreaming = false;
  @tracked conversationId = null;
  @tracked sidebarOpen = false;
  @tracked currentPage = null;
  // Toggle in the <Chat::Panel> header. When true, the next /chat
  // request hints the server to route this turn through a stronger
  // model (CHAT_SMART_MODEL, default anthropic:claude-sonnet-4-6).
  // Session-only — not persisted across reloads so the extra spend
  // can't silently stick.
  @tracked smartModel = false;
  /** True when the chat has assistant content the user hasn't seen yet.
   *  Cleared when the sidebar opens; set on RUN_FINISHED when the sidebar
   *  is closed. Drives the attention cue on the chat button. */
  @tracked hasUnread = false;

  get hasMessages() {
    return this.messages.length > 0;
  }

  _replaceLastMessage(content) {
    this._updateLastMessage({ content });
  }

  /** Shallow-merge a patch into the last message. */
  _updateLastMessage(patch) {
    const prev = this.messages[this.messages.length - 1];
    if (!prev) return;
    this.messages = [...this.messages.slice(0, -1), { ...prev, ...patch }];
    this._scrollChat();
  }

  /** Append a tool-call breadcrumb to the last assistant message. */
  _appendToolCall(call) {
    const prev = this.messages[this.messages.length - 1];
    if (!prev) return;
    const existing = prev.toolCalls || [];
    this._updateLastMessage({ toolCalls: [...existing, call] });
  }

  /** Mark a previously-started tool call as finished / update fields. */
  _finishToolCall(id, patch) {
    const prev = this.messages[this.messages.length - 1];
    if (!prev) return;
    const existing = prev.toolCalls || [];
    const updated = existing.map((c) => (c.id === id ? { ...c, ...patch } : c));
    this._updateLastMessage({ toolCalls: updated });
  }

  _scrollChat() {
    requestAnimationFrame(() => {
      const el = document.getElementById('chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  async sendMessage(text) {
    if (!text.trim() || this.isStreaming) return;

    this.messages = [
      ...this.messages,
      { role: 'user', content: text, timestamp: new Date() },
      { role: 'assistant', content: '', timestamp: new Date() },
    ];

    this.isStreaming = true;
    let accumulated = '';
    // Per-toolCallId bookkeeping for AG-UI's split tool-call events.
    // name: so we can detect propose_actions on END
    // argsBuffer: streamed JSON text from TOOL_CALL_ARGS deltas
    const toolState = new Map();

    try {
      await this.session.ensureFreshToken(90);

      const url = `${buildBaseUrl()}chat/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.session.authorizationHeader,
        },
        body: JSON.stringify({
          message: text,
          history: this._buildHistory(),
          conversation_id: this.conversationId,
          page_context: this.currentPage,
          onboarding: this.onboarding.snapshotForChat(),
          smart: this.smartModel,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          this._replaceLastMessage(
            "Hey there! I'd love to help, but I need you to log in first. " +
              "Head over to the [login page](/login) and come back — I'll be right here waiting.",
          );
        } else if (response.status === 403) {
          this._replaceLastMessage(
            "I can see you're browsing as a guest — welcome! " +
              'Chat is available for registered users. ' +
              "[Sign up or log in](/login) with your own account and I'll be ready to help.",
          );
        } else {
          this._replaceLastMessage(
            `Error: request failed (${response.status})`,
          );
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);

          try {
            const event = JSON.parse(jsonStr);

            switch (event.type) {
              case AG_UI.TEXT_MESSAGE_CONTENT: {
                accumulated += event.delta || '';
                this._replaceLastMessage(accumulated);
                break;
              }

              case AG_UI.TOOL_CALL_START: {
                const id = event.toolCallId;
                const name = event.toolCallName;
                toolState.set(id, { name, argsBuffer: '' });
                // propose_actions is the elicitation tool — don't render it
                // as a tool-call chip (it has no user-facing work); the
                // frontend renders its args as action buttons below the
                // assistant bubble instead.
                if (name !== 'propose_actions') {
                  this._appendToolCall({
                    id,
                    name,
                    args: null,
                    status: 'pending',
                  });
                }
                break;
              }

              case AG_UI.TOOL_CALL_ARGS: {
                const id = event.toolCallId;
                const state = toolState.get(id);
                if (state) state.argsBuffer += event.delta || '';
                break;
              }

              case AG_UI.TOOL_CALL_END: {
                const id = event.toolCallId;
                const state = toolState.get(id);
                if (!state) break;
                // Finalize args: parse the accumulated JSON. For
                // propose_actions extract the actions array and attach it
                // to the assistant message so <ChatMessage> can render
                // buttons.
                let parsedArgs = null;
                try {
                  parsedArgs = state.argsBuffer
                    ? JSON.parse(state.argsBuffer)
                    : {};
                } catch {
                  parsedArgs = { _raw: state.argsBuffer };
                }
                if (state.name === 'propose_actions') {
                  const actions = Array.isArray(parsedArgs?.actions)
                    ? parsedArgs.actions
                    : [];
                  if (actions.length > 0) {
                    this._updateLastMessage({
                      elicitation: { actions },
                    });
                  }
                } else {
                  this._finishToolCall(id, {
                    args: parsedArgs,
                    status: 'done',
                  });
                }
                break;
              }

              case AG_UI.TOOL_CALL_RESULT: {
                const id = event.toolCallId;
                const state = toolState.get(id);
                if (state && state.name !== 'propose_actions') {
                  this._finishToolCall(id, { result: event.content });
                }
                break;
              }

              case AG_UI.CUSTOM: {
                if (event.name === 'reload') {
                  const { resource, id } = event.value || {};
                  this._reloadResource(resource, id);
                } else if (event.name === 'session_meta') {
                  const { conversation_id, usage } = event.value || {};
                  if (conversation_id) this.conversationId = conversation_id;
                  // usage is available for future display; no-op for now.
                  void usage;
                }
                break;
              }

              case AG_UI.RUN_FINISHED: {
                if (!this.sidebarOpen && accumulated) {
                  this.hasUnread = true;
                }
                break;
              }

              case AG_UI.RUN_ERROR: {
                this._replaceLastMessage(
                  `Error: ${event.message || 'stream error'}`,
                );
                break;
              }

              // RUN_STARTED, TEXT_MESSAGE_START/END intentionally ignored —
              // we already synthesize a placeholder assistant message above
              // and don't need message_id bookkeeping for a single-turn UI.
            }
          } catch {
            // skip malformed events
          }
        }
      }

      // Strip navigate markers from final text and trigger navigation.
      // Kept until phase 4 of the AG-UI migration moves navigate fully
      // onto the propose_actions tool.
      if (accumulated) {
        const navMatches = [...accumulated.matchAll(NAVIGATE_RE)];
        if (navMatches.length > 0) {
          accumulated = accumulated.replace(NAVIGATE_RE, '').trim();
          this._replaceLastMessage(accumulated);
          const lastNav = navMatches[navMatches.length - 1][1];
          this.router.transitionTo(lastNav);
        }
      }

      if (!accumulated) {
        this._replaceLastMessage('(no response from agent)');
      }
    } catch (error) {
      this._replaceLastMessage(`Failed to connect: ${error.message}`);
    } finally {
      this.isStreaming = false;
    }
  }

  clearConversation() {
    this.messages = [];
    this.conversationId = null;
    this.hasUnread = false;
  }

  markRead() {
    this.hasUnread = false;
  }

  async _reloadResource(resource, id) {
    if (!resource) return;
    try {
      if (id) {
        const record = await this.store.findRecord(resource, id, {
          reload: true,
        });
        this._pollIfPending(resource, record);
      } else {
        const records = await this.store.findAll(resource, { reload: true });
        records.forEach((record) => this._pollIfPending(resource, record));
      }
    } catch {
      // Non-critical — resource may not be on screen
    }
  }

  _pollIfPending(resource, record) {
    const POLL_TYPES = new Set(['score', 'scrape']);
    const TERMINAL = new Set(['completed', 'done', 'failed', 'error']);
    if (!POLL_TYPES.has(resource)) return;
    if (!record.status || TERMINAL.has(record.status)) return;
    this.poller.watchRecord(record, {
      isTerminal: (rec) => TERMINAL.has(rec.status),
    });
  }

  _buildHistory() {
    // Exclude the last two messages (the new user message + empty assistant)
    return this.messages.slice(0, -2).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }
}
