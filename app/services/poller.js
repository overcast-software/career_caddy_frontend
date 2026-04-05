import Service from '@ember/service';

const DEFAULT_INTERVAL_MS = 3000;

export default class PollerService extends Service {
  _timers = new Map();

  watchRecord(record, options = {}) {
    if (!record || typeof record.reload !== 'function') {
      throw new Error(
        'poller.watchRecord requires an Ember Data record with reload()',
      );
    }

    const {
      intervalMs = DEFAULT_INTERVAL_MS,
      isTerminal = () => false,
      onUpdate = null,
      onStop = null,
      onError = null,
    } = options;

    // ensure previous watcher for this record is cleared
    this.stop(record);

    const tick = async () => {
      try {
        await record.reload();
        if (typeof onUpdate === 'function') onUpdate(record);

        if (isTerminal(record)) {
          this.stop(record);
          if (typeof onStop === 'function') onStop(record);
          return;
        }

        const id = setTimeout(tick, intervalMs);
        this._timers.set(record, id);
      } catch (e) {
        this.stop(record);
        if (typeof onError === 'function') onError(e, record);
      }
    };

    // kick off immediately
    tick();
  }

  stop(record) {
    const id = this._timers.get(record);
    if (id) {
      clearTimeout(id);
      this._timers.delete(record);
    }
  }

  stopAll() {
    for (const [, id] of this._timers) {
      clearTimeout(id);
    }
    this._timers.clear();
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.stopAll();
  }
}
