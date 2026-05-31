import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { htmlSafe } from '@ember/template';

export const TERMINAL = new Set(['completed', 'done', 'failed', 'error']);

const BACKOFF_SEQUENCE_MS = [2000, 4000, 8000, 16000, 32000];

// Long-running queue tasks (Score / Summary against tier-3 LLM,
// or parse_scrape in Phase 5) routinely exceed the 62s baseline cap.
// Extend the sequence by repeating the 32s ceiling so total polling
// wall-clock reaches ~10 minutes before giving up. Per-call opt-in
// via `record.poll({ longRunning: true })`.
const LONG_RUNNING_BACKOFF_MS = [
  ...BACKOFF_SEQUENCE_MS,
  ...Array(18).fill(32000),
];

/**
 * The polling service — both the mechanism (timer + exponential backoff +
 * reload loop) and the policy (spinner integration, sticky flash on
 * navigate-away, pendingIds bookkeeping for in-this-session "is record X
 * being polled?" queries).
 *
 * Consumers should NOT inject this service directly. Use the Pollable
 * mixin on the model (`app/mixins/pollable.js`) and call
 * `record.poll(options)` / `record.pollIfPending(options)`. The service
 * remains the single orchestration anchor — both the mixin and (later)
 * the WarpDrive trait delegate into it.
 */
export default class PollableService extends Service {
  @service events;
  @service router;
  @service spinner;
  @service flashMessages;

  @tracked pendingIds = new Set();

  // Per-record polling state. Lives on the service rather than the
  // record so a navigated-away record (or a record evicted by the
  // store mid-poll) still has its timer cleaned up via stop().
  _timers = new Map();
  _pollCounts = new Map();
  _lastStatus = new Map();
  _sequences = new Map();
  // SSE-mode bookkeeping: per-record unsubscribe thunks returned by
  // events.addListener. Kept here so stop()/stopAll() can revoke them
  // the same way they clear timers in polling mode.
  _eventUnsubscribers = new Map();

  @action isPending(record) {
    // Short-circuit on terminal status so a stale entry left over in
    // pendingIds (or a record whose poll hasn't yet stopped) can't keep
    // a completed/failed row spinning. Fixes "re-score with new data and
    // both rows spin" — the old completed score never spins regardless of
    // pendingIds bookkeeping.
    if (!record || this.isTerminal(record)) return false;
    return this.pendingIds.has(record.id);
  }

  isTerminal(record) {
    return TERMINAL.has(record.status);
  }

  /**
   * Start polling a record. Caller must call spinner.begin() first.
   * Service calls spinner.end() on completion.
   *
   * Pass `longRunning: true` for routes whose backend work routinely
   * exceeds the 62s baseline cap (Score / Summary against tier-3 LLMs,
   * parse_scrape jobs). The flag lifts the cap to ~10 minutes by
   * repeating the 32s ceiling.
   */
  poll(record, options = {}) {
    const {
      isTerminal = (rec) => this.isTerminal(rec),
      successMessage = 'Processing complete.',
      failedMessage = 'Processing failed.',
      longRunning = false,
      onUpdate,
      onComplete,
      onFailed,
      onError,
    } = options;

    const returnUrl = this.router.currentURL;
    this.pendingIds = new Set([...this.pendingIds, record.id]);

    // onStop dispatches the success / fail message + navigate-away flash.
    // Shared between the SSE path and the timer-polling fallback so the
    // user-facing semantics are identical regardless of mechanism.
    const onStop = (rec) => {
      this._removePending(rec.id);
      this.spinner.end();
      const navigatedAway = this.router.currentURL !== returnUrl;
      const failed = rec.status === 'failed' || rec.status === 'error';
      if (failed) {
        if (navigatedAway) {
          this._flashLink(returnUrl, failedMessage, 'danger');
        }
        onFailed?.(rec);
      } else {
        if (navigatedAway) {
          this._flashLink(returnUrl, successMessage, 'success');
        }
        onComplete?.(rec);
      }
    };

    // SSE only. The api emits pg_notify on every terminal transition,
    // the events service reloads the matching record, and pollable
    // hears about it via addListener. Timer-polling is OFF —
    // record.poll(...) registers an SSE listener and waits. If the
    // events channel is disconnected, the spinner stays up until
    // reconnection (the events service auto-reconnects with backoff).
    //
    // Polling fallback was retired 2026-05-30 once SSE proved itself
    // end-to-end. The bare-timer API (watchRecord / unwatchRecord) is
    // still exposed for non-status-polling consumers (chat streaming,
    // resume ingest, AI answer wizard) that don't go through this
    // method.
    //
    // The longRunning flag is no longer consulted — SSE has no cap.
    this._watchViaEvents(record, {
      isTerminal,
      onUpdate,
      onStop,
      onError: (err) => this._handlePollError(record, returnUrl, err, onError),
    });
    // Touch longRunning so the destructure-with-default doesn't get
    // flagged as unused; the flag is documented and may be reused if
    // we ever ship a different mechanism.
    void longRunning;
  }

  _handlePollError(record, returnUrl, err, onError) {
    this._removePending(record.id);
    this.spinner.end();
    const navigatedAway = this.router.currentURL !== returnUrl;
    if (navigatedAway) {
      this._flashLink(returnUrl, 'Lost connection while polling.', 'danger');
    }
    onError?.(err, record);
  }

  /** SSE-driven watch. Registers a listener on the events service;
   *  when the matching record reloads and reaches terminal, fire onStop.
   *  onUpdate fires on every reload (not just terminal) to mirror the
   *  timer-poll contract. */
  _watchViaEvents(record, { isTerminal, onUpdate, onStop, onError }) {
    // Clear any prior watcher on this record so re-poll'ing a record
    // doesn't accumulate listeners.
    this._unwatchViaEvents(record);

    const handler = (_modelName, reloaded) => {
      if (String(reloaded.id) !== String(record.id)) return;
      try {
        if (typeof onUpdate === 'function') onUpdate(reloaded);
        if (isTerminal(reloaded)) {
          this._unwatchViaEvents(reloaded);
          onStop?.(reloaded);
        }
      } catch (err) {
        this._unwatchViaEvents(record);
        onError?.(err);
      }
    };

    const unsubscribe = this.events.addListener(handler);
    this._eventUnsubscribers.set(String(record.id), unsubscribe);
  }

  _unwatchViaEvents(record) {
    const key = String(record.id);
    const unsubscribe = this._eventUnsubscribers.get(key);
    if (unsubscribe) {
      unsubscribe();
      this._eventUnsubscribers.delete(key);
    }
  }

  /**
   * For show routes entering mid-poll. Checks terminal status, starts spinner,
   * and delegates to poll(). No-ops if record is already pending.
   */
  pollIfPending(record, options = {}) {
    const { label = 'Processing…', isTerminal, ...rest } = options;
    const terminalCheck = isTerminal || ((rec) => this.isTerminal(rec));

    if (this.pendingIds.has(record.id)) return;
    if (!record || !record.status || terminalCheck(record)) return;

    this.spinner.begin({ label });
    // `longRunning` rides through via `...rest` — poll() reads it out.
    this.poll(record, { isTerminal: terminalCheck, ...rest });
  }

  stop(record) {
    if (!record) return;
    this._removePending(record.id);
    this.spinner.end();
    this.unwatchRecord(record);
    this._unwatchViaEvents(record);
  }

  stopAll() {
    for (const [, id] of this._timers) {
      clearTimeout(id);
    }
    this._timers.clear();
    this._pollCounts.clear();
    this._lastStatus.clear();
    this._sequences.clear();
    // Revoke any SSE listeners that the per-record watchers installed.
    for (const [, unsubscribe] of this._eventUnsubscribers) {
      try {
        unsubscribe();
      } catch {
        /* listener already dropped; safe to ignore */
      }
    }
    this._eventUnsubscribers.clear();
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.stopAll();
  }

  // ---------------------------------------------------------------------
  // Bare-timer API — the mechanism without the policy. Was a separate
  // `poller` service before the 2026-05-30 merge; consumers that want
  // the backoff loop without the spinner/flash/pendingIds policy call
  // these methods directly (see services/chat.js + the AI answer flow).
  // The policy-aware API on top of this is `poll` / `pollIfPending` /
  // `stop` above.
  // ---------------------------------------------------------------------
  watchRecord(record, options = {}) {
    if (!record || typeof record.reload !== 'function') {
      throw new Error(
        'pollable.watchRecord requires an Ember Data record with reload()',
      );
    }

    const {
      statusField = 'status',
      isTerminal = () => false,
      onUpdate = null,
      onStop = null,
      onError = null,
      longRunning = false,
    } = options;

    const sequence = longRunning
      ? LONG_RUNNING_BACKOFF_MS
      : BACKOFF_SEQUENCE_MS;

    // ensure previous watcher for this record is cleared
    this.unwatchRecord(record);
    this._pollCounts.set(record, 0);
    this._lastStatus.set(record, record[statusField]);
    this._sequences.set(record, sequence);

    const tick = async () => {
      const count = this._pollCounts.get(record) || 0;

      if (count >= sequence.length) {
        this.unwatchRecord(record);
        if (typeof onError === 'function') {
          onError(
            new Error(
              'Polling timed out — the operation may still be processing. Refresh the page to check.',
            ),
            record,
          );
        }
        return;
      }

      try {
        await record.reload();
        if (typeof onUpdate === 'function') onUpdate(record);

        if (isTerminal(record)) {
          this.unwatchRecord(record);
          if (typeof onStop === 'function') onStop(record);
          return;
        }

        // Reset backoff when status changes (e.g. hold → running)
        const prev = this._lastStatus.get(record);
        const curr = record[statusField];
        if (curr !== prev) {
          this._lastStatus.set(record, curr);
          this._pollCounts.set(record, 0);
        } else {
          this._pollCounts.set(record, count + 1);
        }

        const nextCount = this._pollCounts.get(record);
        const delay = sequence[nextCount];

        if (delay !== undefined) {
          const id = setTimeout(tick, delay);
          this._timers.set(record, id);
        } else {
          this.unwatchRecord(record);
          if (typeof onError === 'function') {
            onError(
              new Error(
                'Polling timed out — the operation may still be processing. Refresh the page to check.',
              ),
              record,
            );
          }
        }
      } catch (e) {
        this.unwatchRecord(record);
        if (typeof onError === 'function') onError(e, record);
      }
    };

    // kick off after the first backoff delay
    const id = setTimeout(tick, sequence[0]);
    this._timers.set(record, id);
  }

  unwatchRecord(record) {
    const id = this._timers.get(record);
    if (id) {
      clearTimeout(id);
      this._timers.delete(record);
    }
    this._pollCounts.delete(record);
    this._lastStatus.delete(record);
    this._sequences.delete(record);
  }

  _removePending(id) {
    this.pendingIds = new Set([...this.pendingIds].filter((i) => i !== id));
  }

  _flashLink(url, message, type = 'info') {
    // Callers pass an explicit null/empty message when they don't want a
    // navigated-away flash (e.g. scrape+score chains that handle their
    // own messaging via onComplete). Without this guard we'd render
    // <a>null</a> with a sticky banner — which is exactly what users
    // reported seeing after background scrape+score runs.
    if (!message) return;

    // Turn the first word of the message into the link back to the
    // page the user was on when they started the poll. 'Score ready.'
    // renders as <a>Score</a> ready. — a hyphen better than the old
    // 'Score ready. Go back' phrasing.
    const match = /^(\S+)(\s[\s\S]*)?$/.exec(message);
    const [head, tail] = match ? [match[1], match[2] || ''] : [message, ''];
    // If the captured returnUrl never resolved to a real id (callers
    // that transitionTo with an unsaved record can leave currentURL
    // sitting on /scrapes/null etc.), drop the anchor — a broken link
    // is worse than no link.
    const linkable = url && !/\/(null|undefined)(\/|$|\?|#)/.test(url);
    // The flash container (.alert) is display:flex; justify-content:center.
    // A bare `<a>head</a> tail` puts two children in the flex box and the
    // leading whitespace at the start of the anonymous text flex-item gets
    // collapsed, rendering as "headtail". Wrapping the whole message in a
    // single <span> gives the flex container one child and preserves the
    // word break.
    const inner = linkable
      ? `<a href="${url}" class="underline font-medium">${head}</a>${tail}`
      : `${head}${tail}`;
    this.flashMessages[type](htmlSafe(`<span>${inner}</span>`), {
      sticky: true,
    });
  }
}
