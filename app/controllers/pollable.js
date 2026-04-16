import Controller from '@ember/controller';
import { service } from '@ember/service';

const TERMINAL = new Set(['completed', 'done', 'failed', 'error']);

/**
 * Base controller for show routes with a single pollable model.
 *
 * Usage:
 *   1. Extend this controller
 *   2. In the route's setupController: controller.startPollingIfPending()
 *   3. Override hooks as needed: isTerminal, onPollComplete, onPollFailed, onPollError, onPollUpdate
 */
export default class PollableController extends Controller {
  @service poller;
  @service flashMessages;
  @service spinner;

  _polledRecord = null;

  /** Override to set a custom spinner label. */
  get spinnerLabel() {
    return 'Processing…';
  }

  /** Override to customise the terminal check. */
  isTerminal(record) {
    return TERMINAL.has(record.status);
  }

  /** Called when polling stops with a successful terminal status. */
  onPollComplete(/* record */) {
    this.flashMessages.success('Processing complete.');
  }

  /** Called when polling stops with failed/error status. */
  onPollFailed(/* record */) {
    this.flashMessages.danger('Processing failed.');
  }

  /** Called when polling times out or encounters a network error. */
  onPollError(/* error, record */) {
    this.flashMessages.danger('Lost connection while polling.');
  }

  /** Called on every poll tick (after reload). Override for status refresh etc. */
  onPollUpdate(/* record */) {}

  /** Called when polling actually starts (record is non-terminal). Override for flash/spinner. */
  onPollStart(/* record */) {}

  startPollingIfPending() {
    this.stopPolling();
    const record = this.model;
    if (!record || !record.status || this.isTerminal(record)) return;

    this.onPollStart(record);
    this.spinner.begin({ label: this.spinnerLabel });

    this._polledRecord = record;
    this.poller.watchRecord(record, {
      isTerminal: (rec) => this.isTerminal(rec),
      onUpdate: (rec) => this.onPollUpdate(rec),
      onStop: (rec) => {
        this.spinner.end();
        this._polledRecord = null;
        if (rec.status === 'failed' || rec.status === 'error') {
          this.onPollFailed(rec);
        } else {
          this.onPollComplete(rec);
        }
      },
      onError: (err) => {
        this.spinner.end();
        this._polledRecord = null;
        this.onPollError(err, record);
      },
    });
  }

  stopPolling() {
    if (this._polledRecord) {
      this.spinner.end();
      this.poller.stop(this._polledRecord);
      this._polledRecord = null;
    }
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.stopPolling();
  }
}

export { TERMINAL };
