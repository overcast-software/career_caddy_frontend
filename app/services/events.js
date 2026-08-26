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

// Reconnect backoff.
//
// RECONNECT_MAX_MS is deliberately long. In 2026-08 a proxy misroute made
// /api/v1/events/token/ return 404 on every call; the loop below retried it
// roughly every 6 seconds per open tab, which came to ~70% of all production
// traffic, kept services that should have scaled to zero awake around the
// clock, and produced a budget alert. A ceiling of 30s is still ~2,900
// requests/day/tab against an endpoint that is never coming back. Five
// minutes costs ~290 and is indistinguishable to a user, because the ONLY
// case that reaches the ceiling is one where SSE is already broken.
//
// STABLE_CONNECTION_MS is the other half. See _armStableReset.
const RECONNECT_INITIAL_MS = 1000;
const RECONNECT_MAX_MS = 300_000;
const STABLE_CONNECTION_MS = 60_000;

// The complete specification of what SSE keeps fresh — one row per
// event type the api emits on the cc_events channel. This used to be
// three parallel constants (a handled-types Set, a type→model map and
// a sparse sideload map); a type could be handled while silently
// having no sideload decision recorded anywhere, which is exactly the
// shape of "the event arrived, the template is reactive, and the data
// is still stale". One row per type makes that omission impossible to
// write by accident: `include` is a required key, and `null` is an
// audited answer rather than a gap.
//
// Pinned rather than derived so a silent rename on the backend
// surfaces as a known-unknown event we drop, not as mysterious store
// divergence. The api's own list is job_hunting/lib/events.py
// `EventType`.
//
//   model   — Ember Data model name. Mostly direct; snake_case →
//             dasherized for cover_letter.
//   include — JSON:API `?include=` passed to record.reload(), or null
//             for "reload the record alone". A non-null value means
//             the api's terminal write for this type ALSO mutates a
//             related record that the event never mentions; Ember Data
//             auto-pushes those from the compound document's
//             `included[]`, so one round-trip keeps both fresh.
//
// The `include` column below was audited against the api's terminal
// writes on 2026-08-26 (job_hunting/lib/tasks.py, lib/scraper.py):
//
//   score / summary / cover_letter / answer — the task writes only its
//     own row (`<Model>.objects.filter(pk=...).update(...)`). Nothing
//     else in the store goes stale, so a bare reload is complete.
//     jp.index's Score column reads `JobPost#topScoreValue`, derived
//     off the live `scores` ManyArray this reload refreshes — NOT the
//     `topScore` belongsTo — so it updates without a sideload.
//   scrape — parse writes back to the parent JobPost (title,
//     description, company, link, apply_url) while emitting only a
//     `scrape` event. Without the sideload, jp.show keeps rendering
//     the old description until the user navigates away.
//   resume — the only unsettled row. Ingest creates CHILD records
//     (experiences, educations, projects, certifications, skills,
//     summaries) rather than mutating a parent, so a hasMany that was
//     already materialized empty stays empty. Left null deliberately:
//     the fix is a multi-relationship include whose api support is
//     unverified, and speculatively sideloading six relationships on
//     every resume event is not a change to make blind. Tracked
//     separately — do not "tidy" this into a guess.
const EVENT_TYPES = new Map([
  ['score', { model: 'score', include: null }],
  ['summary', { model: 'summary', include: null }],
  ['cover_letter', { model: 'cover-letter', include: null }],
  ['answer', { model: 'answer', include: null }],
  ['resume', { model: 'resume', include: null }],
  ['scrape', { model: 'scrape', include: 'job-post' }],
]);

export { EVENT_TYPES };

export default class EventsService extends Service {
  @service api;
  @service session;
  @service store;

  _eventSource = null;
  _reconnectMs = RECONNECT_INITIAL_MS;
  _stopped = false;
  _retryTimer = null;
  // In-flight _connect(). Distinct from _eventSource, which is only set once
  // the token round-trip has already succeeded — so on a failing token
  // endpoint _eventSource stays null forever and cannot guard anything.
  _connecting = false;
  // Fires once a connection has stayed open long enough to count as healthy.
  _stableTimer = null;
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
    // Three states mean "a connection is already being handled": streaming,
    // mid-connect, or waiting out a backoff.
    //
    // Guarding on _eventSource ALONE is what made the 2026-08 retry storm
    // possible. When the token fetch fails, _eventSource is never assigned,
    // so every subsequent start() re-entered _connect() immediately and
    // skipped the pending _retryTimer entirely — the backoff existed but
    // nothing was subject to it.
    if (this._eventSource || this._connecting || this._retryTimer) return;
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
    this._clearStableTimer();
    if (this._eventSource) {
      this._eventSource.close();
      this._eventSource = null;
    }
    this._connecting = false;
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
    if (this._connecting || this._eventSource) return;

    this._connecting = true;
    try {
      await this._openStream();
    } finally {
      this._connecting = false;
    }
  }

  async _openStream() {
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
      // Deliberately NOT resetting the backoff here.
      //
      // "Opened" is not "healthy". A stream that opens and dies a second
      // later is flapping, and resetting on every open means the backoff can
      // never accumulate — the ceiling becomes unreachable and a broken
      // endpoint is retried forever at the floor delay. Only a connection
      // that STAYS open is evidence the pipe works, so the reset is armed on
      // a timer and cancelled if the stream drops first.
      this._armStableReset();
    };

    es.onmessage = (e) => {
      // A real frame is stronger proof than elapsed time: the token was
      // accepted, the stream is up, and the hub is fanning out to us.
      this._reconnectMs = RECONNECT_INITIAL_MS;
      this._handleMessage(e);
    };

    es.onerror = () => {
      // EventSource has its own native auto-reconnect, but it doesn't
      // re-fetch the token — once our 5-minute signed token expires,
      // the next reconnect would 401 forever. Close, refetch, restart.
      this.connected = false;
      this._clearStableTimer();
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

  /** Arm the backoff reset. Fires only if the stream stays open for
   *  STABLE_CONNECTION_MS; onerror cancels it. This is what makes the
   *  backoff monotonic across a flapping endpoint while still letting a
   *  genuinely healthy reconnect start from the floor again. */
  _armStableReset() {
    this._clearStableTimer();
    this._stableTimer = setTimeout(() => {
      this._stableTimer = null;
      this._reconnectMs = RECONNECT_INITIAL_MS;
    }, STABLE_CONNECTION_MS);
  }

  _clearStableTimer() {
    if (this._stableTimer) {
      clearTimeout(this._stableTimer);
      this._stableTimer = null;
    }
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
    // Map lookup, not a plain object — an event type off the wire that
    // happens to name an Object.prototype member ('constructor',
    // 'toString') must miss, not resolve to a function.
    const spec = EVENT_TYPES.get(type);
    if (!spec || id == null) return;

    const modelName = spec.model;
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
    //
    // When the type declares an `include`, ask the api to sideload the
    // related record(s) via JSON:API ?include=. Ember Data parses the
    // compound document and auto-pushes any related records from
    // `included[]` into the store — no manual cascade, no peekRecord,
    // no second round-trip. Default JSONAPIAdapter buildQuery reads
    // snapshot.include (set from reload options) and serializes it as
    // `?include=<value>`. A null `include` is an audited "this type's
    // terminal write touches nothing else" — see EVENT_TYPES.
    const reloadOptions = spec.include ? { include: spec.include } : undefined;
    record
      .reload(reloadOptions)
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
