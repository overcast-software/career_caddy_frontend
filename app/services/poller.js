import Service from '@ember/service';

const BACKOFF_SEQUENCE_MS = [3000, 3000, 6000, 10000, 10000];

export default class PollerService extends Service {
  _timers = new Map();
  _pollCounts = new Map();

  watchRecord(record, options = {}) {
    if (!record || typeof record.reload !== 'function') {
      throw new Error(
        'poller.watchRecord requires an Ember Data record with reload()',
      );
    }

    const {
      isTerminal = () => false,
      onUpdate = null,
      onStop = null,
      onError = null,
    } = options;

    // ensure previous watcher for this record is cleared
    this.stop(record);
    this._pollCounts.set(record, 0);

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

        this._pollCounts.set(record, count + 1);
        const delay = BACKOFF_SEQUENCE_MS[count + 1];

        if (delay !== undefined) {
          const id = setTimeout(tick, delay);
          this._timers.set(record, id);
        } else {
          // exhausted backoff sequence on next tick
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
  }

  stopAll() {
    for (const [, id] of this._timers) {
      clearTimeout(id);
    }
    this._timers.clear();
    this._pollCounts.clear();
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.stopAll();
  }
}
