import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { htmlSafe } from '@ember/template';

export const TERMINAL = new Set(['completed', 'done', 'failed', 'error']);

export default class PollableService extends Service {
  @service poller;
  @service router;
  @service spinner;
  @service flashMessages;

  @tracked pendingIds = new Set();

  @action isPending(record) {
    return this.pendingIds.has(record.id);
  }

  isTerminal(record) {
    return TERMINAL.has(record.status);
  }

  /**
   * Start polling a record. Caller must call spinner.begin() first.
   * Service calls spinner.end() on completion.
   */
  poll(record, options = {}) {
    const {
      isTerminal = (rec) => this.isTerminal(rec),
      successMessage = 'Processing complete.',
      failedMessage = 'Processing failed.',
      onUpdate,
      onComplete,
      onFailed,
      onError,
    } = options;

    const returnUrl = this.router.currentURL;
    this.pendingIds = new Set([...this.pendingIds, record.id]);

    this.poller.watchRecord(record, {
      isTerminal,
      onUpdate,
      onStop: (rec) => {
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
      },
      onError: (err) => {
        this._removePending(record.id);
        this.spinner.end();
        const navigatedAway = this.router.currentURL !== returnUrl;
        if (navigatedAway) {
          this._flashLink(
            returnUrl,
            'Lost connection while polling.',
            'danger',
          );
        }
        onError?.(err, record);
      },
    });
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
    this.poll(record, { isTerminal: terminalCheck, ...rest });
  }

  stop(record) {
    if (!record) return;
    this._removePending(record.id);
    this.spinner.end();
    this.poller.stop(record);
  }

  _removePending(id) {
    this.pendingIds = new Set([...this.pendingIds].filter((i) => i !== id));
  }

  _flashLink(url, message, type = 'info') {
    this.flashMessages[type](
      htmlSafe(
        `${message} <a href="${url}" class="underline font-medium">Go back</a>`,
      ),
      { sticky: true },
    );
  }
}
