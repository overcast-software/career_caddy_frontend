import Service from '@ember/service';

const BACKOFF_SEQUENCE_MS = [2000, 4000, 8000, 16000, 32000];

export default class PollerService extends Service {
  _timers = new Map();
  _pollCounts = new Map();
  _lastStatus = new Map();

  watchRecord(record, options = {}) {
    if (!record || typeof record.reload !== 'function') {
      throw new Error(
        'poller.watchRecord requires an Ember Data record with reload()',
      );
    }

    const {
      statusField = 'status',
      isTerminal = () => false,
      onUpdate = null,
      onStop = null,
      onError = null,
    } = options;

    // ensure previous watcher for this record is cleared
    this.stop(record);
    this._pollCounts.set(record, 0);
    this._lastStatus.set(record, record[statusField]);

    const tick = async () => {
      const count = this._pollCounts.get(record) || 0;

      if (count >= BACKOFF_SEQUENCE_MS.length) {
        this.stop(record);
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
          this.stop(record);
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
        const delay = BACKOFF_SEQUENCE_MS[nextCount];

        if (delay !== undefined) {
          const id = setTimeout(tick, delay);
          this._timers.set(record, id);
        } else {
          this.stop(record);
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
        this.stop(record);
        if (typeof onError === 'function') onError(e, record);
      }
    };

    // kick off after the first backoff delay
    const id = setTimeout(tick, BACKOFF_SEQUENCE_MS[0]);
    this._timers.set(record, id);
  }

  stop(record) {
    const id = this._timers.get(record);
    if (id) {
      clearTimeout(id);
      this._timers.delete(record);
    }
    this._pollCounts.delete(record);
    this._lastStatus.delete(record);
  }

  stopAll() {
    for (const [, id] of this._timers) {
      clearTimeout(id);
    }
    this._timers.clear();
    this._pollCounts.clear();
    this._lastStatus.clear();
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.stopAll();
  }
}
