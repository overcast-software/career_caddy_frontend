import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';

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

// Strip scheme + hostname from hrefs the LLM hallucinated, e.g.
// "example.com/job-posts/1" or "https://example.com/job-posts/1".
// Returns a bare path ("/job-posts/1") when the URL resolves to a known
// app route; returns null if the href looks legitimately external.
export function sanitizeAppHref(href) {
  if (typeof href !== 'string' || !href) return null;
  if (href.startsWith('/')) return href;

  const leadingRouteRe = new RegExp(
    `^(?:https?:\\/\\/)?[^\\/]+\\/(${[...APP_ROUTES].join('|')})(\\/.*)?$`,
  );
  const match = href.match(leadingRouteRe);
  if (match) {
    return `/${match[1]}${match[2] ?? ''}`;
  }
  return null;
}

export default class ChatMessageComponent extends Component {
  @service chat;
  @service router;
  @service store;
  @service flashMessages;

  /** Tool-call breadcrumbs for this message: a collapsed view of what
   *  the agent actually did (which tools fired, their arguments, their
   *  truncated results). Surfaced to everyone so users can see "it
   *  searched your job posts" or "it read your resume" in-context. */
  get showToolCalls() {
    const calls = this.args.message.toolCalls || [];
    return calls.length > 0;
  }

  get toolCalls() {
    return this.args.message.toolCalls || [];
  }

  get elicitation() {
    if (this.args.message.role !== 'assistant') return null;
    // Populated by services/chat.js from the propose_actions tool's
    // ToolCallArgs payload under the AG-UI protocol. Shape:
    //   { actions: [{label, navigate|model|message}, ...] }
    const e = this.args.message.elicitation;
    if (e && Array.isArray(e.actions) && e.actions.length > 0) {
      return e;
    }
    return null;
  }

  get displayContent() {
    return this.args.message.content;
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
        // Host is something like example.com but the PATH starts with an
        // app route (e.g. https://example.com/job-posts/1). Strip the host
        // and route internally.
        const rewritten = sanitizeAppHref(href);
        if (rewritten) {
          event.preventDefault();
          this.router.transitionTo(rewritten);
          return;
        }
      } catch {
        // invalid URL — fall through to default browser behavior
      }
      return;
    }

    // Scheme-less but host-prefixed ("example.com/job-posts/1"). Browsers
    // treat these as relative; intercept before navigation so we end up on
    // the actual app route.
    const rewritten = sanitizeAppHref(href);
    if (rewritten) {
      event.preventDefault();
      this.router.transitionTo(rewritten);
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
      // Defend against example.com/job-posts/1-style hallucinations: if
      // the agent prefixed a host, strip it. Bare paths pass through
      // unchanged.
      const target = act.navigate.startsWith('/')
        ? act.navigate
        : sanitizeAppHref(act.navigate) || act.navigate;
      this.router.transitionTo(target);
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
