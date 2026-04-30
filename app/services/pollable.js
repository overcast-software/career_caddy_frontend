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
