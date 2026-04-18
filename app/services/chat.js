import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';

const NAVIGATE_RE = /<!--\s*navigate:(\/[^\s]*)\s*-->/g;

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
  /** True when the chat has assistant content the user hasn't seen yet.
   *  Cleared when the sidebar opens; set when a `done` event lands while
   *  the sidebar is closed. Drives the attention cue on the chat button. */
  @tracked hasUnread = false;

  get hasMessages() {
    return this.messages.length > 0;
  }

  _replaceLastMessage(content) {
    this._updateLastMessage({ content });
  }

  /** Shallow-merge a patch into the last message. Use this when you want
   *  to update fields (content, toolCalls, ...) without clobbering the
   *  rest of the record. */
  _updateLastMessage(patch) {
    const prev = this.messages[this.messages.length - 1];
    if (!prev) return;
    this.messages = [...this.messages.slice(0, -1), { ...prev, ...patch }];
    this._scrollChat();
  }

  /** Append a tool-call breadcrumb to the last assistant message. Used by
   *  the `tool_call_start` SSE event; staff-gated rendering happens in
   *  chat/panel.hbs via the assistant message's toolCalls array. */
  _appendToolCall(call) {
    const prev = this.messages[this.messages.length - 1];
    if (!prev) return;
    const existing = prev.toolCalls || [];
    this._updateLastMessage({ toolCalls: [...existing, call] });
  }

  /** Mark a previously-started tool call as finished and attach its
   *  (truncated) result. Correlated by tool_call_id. */
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

    try {
      await this.session.ensureFreshToken(90);

      console.log('[chat] sending page_context:', this.currentPage);
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

            if (event.type === 'text') {
              accumulated += event.content;
              this._replaceLastMessage(accumulated);
            } else if (event.type === 'tool_call_start') {
              this._appendToolCall({
                id: event.tool_call_id,
                name: event.tool_name,
                args: event.args,
                status: 'pending',
              });
            } else if (event.type === 'tool_call_end') {
              this._finishToolCall(event.tool_call_id, {
                status: 'done',
                result: event.content,
              });
            } else if (event.type === 'done') {
              accumulated = event.content;
              this.conversationId =
                event.conversation_id || this.conversationId;
              this._replaceLastMessage(accumulated);
              if (!this.sidebarOpen && accumulated) {
                this.hasUnread = true;
              }
            } else if (event.type === 'navigate') {
              this.router.transitionTo(event.url);
            } else if (event.type === 'reload') {
              this._reloadResource(event.resource, event.id);
            } else if (event.type === 'error') {
              this._replaceLastMessage(`Error: ${event.content}`);
            }
          } catch {
            // skip malformed events
          }
        }
      }

      // Strip navigate markers from final text and trigger navigation
      if (accumulated) {
        const navMatches = [...accumulated.matchAll(NAVIGATE_RE)];
        if (navMatches.length > 0) {
          accumulated = accumulated.replace(NAVIGATE_RE, '').trim();
          this._replaceLastMessage(accumulated);
          const lastNav = navMatches[navMatches.length - 1][1];
          this.router.transitionTo(lastNav);
        }
      }

      // If we never got any content, show that
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
