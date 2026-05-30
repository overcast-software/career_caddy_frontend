import { getOwner } from '@ember/owner';

/**
 * HOC trait that grants a model class the `poll` / `pollIfPending` /
 * `stopPolling` instance methods, each delegating into the singleton
 * `pollable` service. Use it as a class wrapper:
 *
 *   export default class Score extends Pollable(Model) {
 *     @attr score;
 *     @attr status;
 *     // ...
 *   }
 *
 * Stack with other traits for multiple inheritance:
 *
 *   export default class Score extends Pollable(Auditable(Model)) {
 *     // ...
 *   }
 *
 * Call sites collapse from
 *
 *   this.pollable.poll(record, { longRunning: true })
 *
 * to
 *
 *   record.poll({ longRunning: true })
 *
 * The orchestration anchor — pendingIds, spinner integration, the
 * navigate-away flash, the backoff loop — stays on the singleton
 * service. This module is pure delegation.
 *
 * (Lives in `traits/` rather than `mixins/` deliberately — the
 * eslint-plugin-ember `no-mixins` rule polices the legacy
 * `Mixin.create` pattern by directory, and this HOC class-factory is
 * a different shape that the linter would otherwise flag.)
 *
 * WarpDrive note: when Ember Data swaps to schema-described resources,
 * these four methods become a trait registered against the resource
 * schema. The call sites (`record.poll(...)`) don't change.
 */
export function Pollable(BaseClass) {
  return class extends BaseClass {
    /**
     * Start polling this record. Options match `pollable.poll`:
     *
     * - longRunning: boolean — extend the cap to ~10 min for LLM-backed work.
     * - successMessage / failedMessage: string — sticky flash text on
     *   navigate-away.
     * - onUpdate(rec) — after each reload before terminal check.
     * - onComplete(rec) / onFailed(rec) / onError(err, rec) — terminal callbacks.
     * - isTerminal(rec) — override the default TERMINAL-set membership.
     *
     * Caller is expected to have started a spinner via the spinner
     * service if the page needs one; the pollable service will end()
     * it on terminal transition. The Score / Summary creation flows
     * spin up the spinner with their own label before calling
     * `record.poll(...)`.
     */
    poll(options = {}) {
      return getOwner(this).lookup('service:pollable').poll(this, options);
    }

    /**
     * Show-route entry point: start polling iff the record's current
     * status isn't already terminal AND it isn't already being polled.
     * Spinner-aware (begins a spinner internally with the supplied label
     * before delegating to poll).
     */
    pollIfPending(options = {}) {
      return getOwner(this)
        .lookup('service:pollable')
        .pollIfPending(this, options);
    }

    /**
     * Cancel any in-flight poll on this record. Idempotent; safe to call
     * when no poll is active.
     */
    stopPolling() {
      return getOwner(this).lookup('service:pollable').stop(this);
    }
  };
}
