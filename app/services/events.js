import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Phase 3 of Plans/Push status updates — SSE replaces polling cap for
 * queue-backed records. Opens a single per-user EventSource against
 * /api/v1/events/ and dispatches each terminal-status notification to
 * the matching record in the store via peekRecord + reload.
 *
 * Architecture choice: the store IS the reactivity layer. We don't
 * register per-record callbacks here; we just keep the store fresh.
 * Templates that read `score.isPending` / `summary.status` / etc.
 * re-render automatically once Ember Data fires its change notification
 * after `reload()`.
 *
 * Polling (`services/pollable.js`) stays in the codebase as a fallback
 * until SSE proves itself. When a page-level action like
 * `record.poll({onComplete, ...})` runs, its callbacks still fire on
 * terminal — both polling and SSE may trigger reloads but the reload
 * is idempotent, and pollable's terminal check is a single-fire.
 *
 * The events service is the cross-page reactivity that the polling
 * design alone couldn't provide: a Score created from the browser
 * extension lands on this page's table just by virtue of being in the
 * store + reachable by id.
 */

const RECONNECT_INITIAL_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

// Types that the api emits on the cc_events channel. Pinned here so a
// silent rename on the backend surfaces as a known event we just don't
// know how to handle, rather than mysterious store divergence.
const HANDLED_TYPES = new Set([
  'score',
  'summary',
  'cover_letter',
  'answer',
  'resume',
  'scrape',
]);

// Map backend event type → Ember Data model name. Most are direct;
// snake_case → dasherized for cover_letter.
const TYPE_TO_MODEL = {
  score: 'score',
  summary: 'summary',
  cover_letter: 'cover-letter',
  answer: 'answer',
  resume: 'resume',
  scrape: 'scrape',
};

export default class EventsService extends Service {
  @service api;
  @service session;
  @service store;

  _eventSource = null;
  _reconnectMs = RECONNECT_INITIAL_MS;
  _stopped = false;
  _retryTimer = null;
  // Listeners notified AFTER a record reload completes. Pollable
  // subscribes here to fire onComplete / onFailed without timer-
  // polling when the SSE channel is healthy. Set rather than array
  // so addListener/removeListener pairs are idempotent and O(1).
  _listeners = new Set();

  @tracked connected = false;

  /** Open the EventSource. Idempotent — calling twice while already
   *  connected is a no-op. Call from the application route after auth
   *  succeeds. */
  async start() {
    if (this._eventSource) return;
    this._stopped = false;
    await this._connect();
  }

  /** Close + stop auto-reconnect. Call on logout. */
  stop() {
    this._stopped = true;
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    if (this._eventSource) {
      this._eventSource.close();
      this._eventSource = null;
    }
    this.connected = false;
    this._reconnectMs = RECONNECT_INITIAL_MS;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.stop();
  }

  async _connect() {
    if (this._stopped) return;
    if (!this.session.isAuthenticated) return;

    let token;
    try {
      const resp = await fetch(this.api.url('/api/v1/events/token/'), {
        method: 'POST',
        headers: this.api.headers(),
      });
      if (!resp.ok) {
        throw new Error(`events token fetch failed: ${resp.status}`);
      }
      const body = await resp.json();
      token = body.token;
      if (!token) throw new Error('events token missing in response');
    } catch (e) {
      // Auth or network. Back off and retry.
      console.warn('[events] token fetch failed:', e);
      this._scheduleReconnect();
      return;
    }

    const url = this.api.url(
      `/api/v1/events/?token=${encodeURIComponent(token)}`,
    );
    const es = new EventSource(url);
    this._eventSource = es;

    es.onopen = () => {
      this.connected = true;
      // Reset backoff on a clean connect — exponential pressure should
      // only build during sustained outages, not reset every successful
      // tick.
      this._reconnectMs = RECONNECT_INITIAL_MS;
    };

    es.onmessage = (e) => {
      this._handleMessage(e);
    };

    es.onerror = () => {
      // EventSource has its own native auto-reconnect, but it doesn't
      // re-fetch the token — once our 5-minute signed token expires,
      // the next reconnect would 401 forever. Close, refetch, restart.
      this.connected = false;
      es.close();
      if (this._eventSource === es) {
        this._eventSource = null;
      }
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (this._stopped) return;
    if (this._retryTimer) return;
    const delay = this._reconnectMs;
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this._connect();
    }, delay);
    this._reconnectMs = Math.min(delay * 2, RECONNECT_MAX_MS);
  }

  _handleMessage(event) {
    if (!event.data) return;
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    const type = payload?.type;
    const id = payload?.id;
    if (!HANDLED_TYPES.has(type) || id == null) return;

    const modelName = TYPE_TO_MODEL[type];
    const record = this.store.peekRecord(modelName, String(id));
    if (!record) {
      // Record not in this user's store — they haven't visited a page
      // that loaded it yet, OR it belongs to a hasMany the active page
      // hasn't subscribed to. Either way, reloading would prefetch a
      // record they didn't ask for. Skip.
      return;
    }

    // Wrap in .catch — Ember Data 5.6's reload pipeline can throw
    //   "can't access property 'data', documentHash is undefined"
    // out of the JSON:API cache layer when SSE fires for a record
    // whose cache is in an in-between state (freshly-saved race,
    // evicted record, etc.). Log and continue; the listener still
    // gets notified so the spinner ends and the user sees terminal
    // state on next interaction or page reload.
    record
      .reload()
      .catch((e) => console.warn('[events] reload failed:', e))
      .finally(() => this._notify(modelName, record));
  }

  /** Subscribe to post-reload notifications. Returns an unsubscribe
   *  thunk. The callback receives (modelName, record) AFTER the
   *  record's reload promise has settled — its store state is fresh.
   */
  addListener(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  removeListener(fn) {
    this._listeners.delete(fn);
  }

  _notify(modelName, record) {
    // Snapshot the set so a listener that unsubscribes itself doesn't
    // perturb the iteration.
    const snapshot = Array.from(this._listeners);
    for (const fn of snapshot) {
      try {
        fn(modelName, record);
      } catch (e) {
        console.warn('[events] listener threw:', e);
      }
    }
  }
}
