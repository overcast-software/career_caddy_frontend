import Controller from '@ember/controller';
import { service } from '@ember/service';

const TERMINAL = new Set(['completed', 'done', 'failed', 'error']);

export default class PollableController extends Controller {
  @service poller;
  @service flashMessages;

  _polledRecord = null;

  startPollingIfPending() {
    this.stopPolling();
    const record = this.model;
    if (!record?.status || TERMINAL.has(record.status)) return;

    this._polledRecord = record;
    this.poller.watchRecord(record, {
      isTerminal: (rec) => TERMINAL.has(rec.status),
      onStop: (rec) => {
        this._polledRecord = null;
        if (rec.status === 'failed' || rec.status === 'error') {
          this.flashMessages.danger('Processing failed.');
        } else {
          this.flashMessages.success('Processing complete.');
        }
      },
      onError: () => {
        this._polledRecord = null;
        this.flashMessages.danger('Lost connection while polling.');
      },
    });
  }

  stopPolling() {
    if (this._polledRecord) {
      this.poller.stop(this._polledRecord);
      this._polledRecord = null;
    }
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.stopPolling();
  }
}
