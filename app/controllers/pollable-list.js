import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { TERMINAL } from './pollable';

/**
 * Base controller for list routes that create-then-poll individual records.
 *
 * Usage:
 *   1. Extend this controller, set `recordType` (e.g. 'score')
 *   2. After saving a new record, call `this.pollRecord(saved)`
 *   3. Use `this.isPending(record)` in templates for loading indicators
 *   4. Override hooks: onRecordComplete, onRecordFailed, onRecordError
 */
export default class PollableListController extends Controller {
  @service poller;
  @service store;
  @service flashMessages;

  /** Ember Data model name — subclasses must set this for cleanup. */
  recordType = null;

  @tracked pendingIds = new Set();

  /** Override to customise the terminal check. */
  isTerminal(record) {
    return TERMINAL.has(record.status);
  }

  @action isPending(record) {
    return this.pendingIds.has(record.id);
  }

  /** Called when a polled record reaches a successful terminal status. */
  onRecordComplete(/* record */) {}

  /** Called when a polled record reaches failed/error status. */
  onRecordFailed(/* record */) {
    this.flashMessages.danger('Processing failed.');
  }

  /** Called on polling timeout or network error. */
  onRecordError(/* error, record */) {
    this.flashMessages.danger('Lost connection while polling.');
  }

  pollRecord(record) {
    this.pendingIds = new Set([...this.pendingIds, record.id]);
    this.poller.watchRecord(record, {
      isTerminal: (rec) => this.isTerminal(rec),
      onStop: (rec) => {
        this._removePending(rec.id);
        if (rec.status === 'failed' || rec.status === 'error') {
          this.onRecordFailed(rec);
        } else {
          this.onRecordComplete(rec);
        }
      },
      onError: (err) => {
        this._removePending(record.id);
        this.onRecordError(err, record);
      },
    });
  }

  _removePending(id) {
    this.pendingIds = new Set([...this.pendingIds].filter((i) => i !== id));
  }

  willDestroy() {
    super.willDestroy(...arguments);
    for (const id of this.pendingIds) {
      const record = this.store.peekRecord(this.recordType, id);
      if (record) this.poller.stop(record);
    }
  }
}
