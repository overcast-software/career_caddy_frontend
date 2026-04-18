import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';

const ELICITATION_RE =
  /```json\s*\n(\{[^`]*"elicitation"\s*:\s*true[^`]*\})\s*\n```\s*$/;

/** Fields the agent is allowed to patch on each model type via
 *  `{label, model: {type, id, patch}}` action buttons. Anything not in
 *  this set is dropped before save — keeps an adversarial or confused
 *  agent from flipping ownership fields, toggling staff flags, etc. */
const ALLOWED_ACTION_PATCHES = {
  resume: new Set(['favorite', 'title', 'name', 'notes']),
  'cover-letter': new Set(['favorite', 'status']),
  answer: new Set(['favorite']),
  'job-post': new Set(['favorite']),
  user: new Set(['onboarding']),
};

// LLM sometimes emits <a href="https://resumes/31"> instead of [text](/resumes/31).
// Catch these malformed URLs where the "hostname" is actually an app route segment.
const APP_ROUTES = new Set([
  'resumes',
  'job-posts',
  'job-applications',
  'companies',
  'scores',
  'cover-letters',
  'questions',
  'summaries',
  'scrapes',
  'career-data',
  'settings',
  'admin',
  'caddy',
]);

export default class ChatMessageComponent extends Component {
  @service chat;
  @service router;
  @service currentUser;
  @service store;
  @service flashMessages;

  /** Tool-call breadcrumbs for this message. Visible only to staff — the
   *  debug-style view of what the agent actually did (which tools fired,
   *  their arguments, their truncated results). Staff use this to detect
   *  "agent promised but didn't execute" regressions at a glance. */
  get showToolCalls() {
    const user = this.currentUser.user;
    if (!user?.isStaff) return false;
    const calls = this.args.message.toolCalls || [];
    return calls.length > 0;
  }

  get toolCalls() {
    return this.args.message.toolCalls || [];
  }

  get elicitation() {
    if (this.args.message.role !== 'assistant') return null;
    const content = this.args.message.content || '';
    const match = content.match(ELICITATION_RE);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.elicitation && Array.isArray(parsed.actions)) {
        return parsed;
      }
    } catch {
      // malformed JSON — ignore
    }
    return null;
  }

  get displayContent() {
    if (!this.elicitation) return this.args.message.content;
    return this.args.message.content.replace(ELICITATION_RE, '').trim();
  }

  @action
  handleClick(event) {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('mailto:')) return;

    // Catch malformed LLM links like https://resumes/31 or http://job-posts/42
    if (href.startsWith('http')) {
      try {
        const url = new URL(href);
        if (APP_ROUTES.has(url.hostname)) {
          event.preventDefault();
          const path = `/${url.hostname}${url.pathname}`;
          this.router.transitionTo(path);
          return;
        }
      } catch {
        // invalid URL — fall through to default browser behavior
      }
      return;
    }

    event.preventDefault();
    const path = href.startsWith('/') ? href : `/${href}`;
    this.router.transitionTo(path);
  }

  /** Dispatch an elicitation action by its shape:
   *    {label, navigate: "/path"}         → route transition, no chat turn
   *    {label, model: {type, id, patch}}  → Ember Data save, no chat turn
   *    {label, message: "..."}            → new chat turn (legacy)
   *  Kept as the single entry point so the agent's prompt can mix shapes
   *  in the same elicitation block.
   */
  @action
  runAction(act) {
    if (!act || typeof act !== 'object') return;

    if (act.navigate && typeof act.navigate === 'string') {
      this.router.transitionTo(act.navigate);
      return;
    }

    if (act.model && typeof act.model === 'object') {
      this._runModelAction(act.model);
      return;
    }

    if (typeof act.message === 'string' && act.message.trim()) {
      this.chat.sendMessage(act.message);
      return;
    }
  }

  async _runModelAction({ type, id, patch }) {
    const allowed = ALLOWED_ACTION_PATCHES[type];
    if (!allowed) {
      this.flashMessages?.warning(
        `Chat action on unsupported type "${type}" was ignored.`,
      );
      return;
    }
    if (!id || !patch || typeof patch !== 'object') return;

    const record = this.store.peekRecord(type, id);
    if (!record) {
      // Not in the store — could fetch, but for button-driven actions the
      // user just saw the record. Fall back to findRecord so the save
      // still succeeds even if the store was evicted.
      try {
        const fetched = await this.store.findRecord(type, id);
        this._applyAndSave(fetched, patch, allowed);
      } catch {
        this.flashMessages?.danger(
          `Couldn't load ${type} ${id} to apply the change.`,
        );
      }
      return;
    }
    this._applyAndSave(record, patch, allowed);
  }

  async _applyAndSave(record, patch, allowed) {
    const safePatch = {};
    for (const [k, v] of Object.entries(patch)) {
      if (allowed.has(k)) safePatch[k] = v;
    }
    if (Object.keys(safePatch).length === 0) return;
    Object.assign(record, safePatch);
    try {
      await record.save();
    } catch {
      this.flashMessages?.danger('Change failed to save.');
      record.rollbackAttributes?.();
    }
  }
}
