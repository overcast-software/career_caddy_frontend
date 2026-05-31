import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

module('Unit | Service | pollable', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.service = this.owner.lookup('service:pollable');
    this.watchedRecords = [];
    this.stoppedRecords = [];
    // Stub the bare-timer surface so policy-path tests don't fire real
    // setTimeouts. The service merged with the prior poller service on
    // 2026-05-30 — `watchRecord` / `unwatchRecord` are the public bare-
    // timer methods that `poll` and `stop` delegate into.
    this.service.watchRecord = (rec, opts) => {
      this.watchedRecords.push({ rec, opts });
    };
    this.service.unwatchRecord = (rec) => {
      this.stoppedRecords.push(rec);
    };
    // Stub the events service — these tests cover the polling-fallback
    // path. SSE-mode tests live in this file too (search "events.connected")
    // and explicitly set events.connected = true before calling poll().
    this.service.events = { connected: false, addListener: () => () => {} };
    this.service.spinner = {
      _count: 0,
      isShowing: false,
      label: null,
      begin(opts = {}) {
        this._count++;
        if (this._count === 1) {
          this.label = opts.label || null;
          this.isShowing = true;
        }
      },
      end() {
        if (this._count <= 0) return;
        this._count--;
        if (this._count === 0) {
          this.isShowing = false;
          this.label = null;
        }
      },
    };
    this.service.router = { currentURL: '/test' };
    this.flashMessages = [];
    const push = (type) => (msg, opts) =>
      this.flashMessages.push({ type, msg, opts });
    this.service.flashMessages = {
      info: push('info'),
      success: push('success'),
      danger: push('danger'),
    };
  });

  test('it exists', function (assert) {
    assert.ok(this.service);
  });

  test('TERMINAL contains expected statuses', function (assert) {
    assert.true(TERMINAL.has('completed'));
    assert.true(TERMINAL.has('done'));
    assert.true(TERMINAL.has('failed'));
    assert.true(TERMINAL.has('error'));
    assert.false(TERMINAL.has('pending'));
  });

  test('isTerminal checks TERMINAL set', function (assert) {
    assert.true(this.service.isTerminal({ status: 'completed' }));
    assert.true(this.service.isTerminal({ status: 'failed' }));
    assert.false(this.service.isTerminal({ status: 'pending' }));
    assert.false(this.service.isTerminal({ status: 'running' }));
  });

  test('poll adds record id to pendingIds', function (assert) {
    this.service.poll({ id: '42', reload: () => {} });
    assert.true(this.service.pendingIds.has('42'));
  });

  test('isPending returns true for polled record', function (assert) {
    const rec = { id: '7', reload: () => {} };
    this.service.poll(rec);
    assert.true(this.service.isPending(rec));
  });

  test('isPending returns false for non-polled record', function (assert) {
    assert.false(this.service.isPending({ id: '99' }));
  });

  test('poll passes onUpdate to watchRecord', function (assert) {
    const onUpdate = () => {};
    this.service.poll({ id: '1', reload: () => {} }, { onUpdate });
    assert.strictEqual(this.watchedRecords[0].opts.onUpdate, onUpdate);
  });

  test('poll forwards longRunning to watchRecord', function (assert) {
    this.service.poll({ id: 'lr', reload: () => {} }, { longRunning: true });
    assert.true(this.watchedRecords[0].opts.longRunning);
  });

  test('poll defaults longRunning to false', function (assert) {
    this.service.poll({ id: 'short', reload: () => {} });
    assert.false(this.watchedRecords[0].opts.longRunning);
  });

  test('pollIfPending forwards longRunning to watchRecord', function (assert) {
    this.service.pollIfPending(
      { id: 'lr2', status: 'pending', reload: () => {} },
      { longRunning: true },
    );
    assert.true(this.watchedRecords[0].opts.longRunning);
  });

  test('pollIfPending skips terminal records', function (assert) {
    this.service.pollIfPending({ id: '1', status: 'completed' });
    assert.strictEqual(this.watchedRecords.length, 0);
    assert.false(this.service.spinner.isShowing);
  });

  test('pollIfPending starts spinner and polls non-terminal records', function (assert) {
    this.service.pollIfPending(
      { id: '2', status: 'pending', reload: () => {} },
      { label: 'Testing…' },
    );
    assert.strictEqual(this.watchedRecords.length, 1);
    assert.true(this.service.spinner.isShowing);
    assert.strictEqual(this.service.spinner.label, 'Testing…');
  });

  test('pollIfPending no-ops if record already pending', function (assert) {
    const rec = { id: '3', status: 'pending', reload: () => {} };
    this.service.poll(rec);
    const countBefore = this.service.spinner._count;
    this.service.pollIfPending(rec, { label: 'Again…' });
    assert.strictEqual(
      this.watchedRecords.length,
      1,
      'watchRecord not called again',
    );
    assert.strictEqual(
      this.service.spinner._count,
      countBefore,
      'spinner count unchanged',
    );
  });

  test('stop removes pending and stops the watcher', function (assert) {
    const rec = { id: '5', reload: () => {} };
    this.service.spinner.begin();
    this.service.poll(rec);
    this.service.stop(rec);
    assert.false(this.service.pendingIds.has('5'));
    assert.true(this.stoppedRecords.includes(rec));
  });

  test('onStop fires onComplete and ends spinner when not navigated', function (assert) {
    let completeCalled = false;
    this.service.spinner.begin();
    this.service.poll(
      { id: '10', reload: () => {} },
      { onComplete: () => (completeCalled = true) },
    );
    const { opts } = this.watchedRecords[0];
    opts.onStop({ id: '10', status: 'completed' });
    assert.true(completeCalled);
    assert.false(this.service.spinner.isShowing);
    assert.strictEqual(
      this.flashMessages.length,
      0,
      'no flash when on same page',
    );
  });

  test('onStop fires flash link when navigated away', function (assert) {
    this.service.spinner.begin();
    this.service.poll({ id: '11', reload: () => {} });
    this.service.router = { currentURL: '/somewhere-else' };
    const { opts } = this.watchedRecords[0];
    opts.onStop({ id: '11', status: 'completed' });
    assert.strictEqual(this.flashMessages.length, 1);
    assert.true(this.flashMessages[0].opts.sticky);
  });

  // ── SSE mode ───────────────────────────────────────────────────────
  // When events.connected, poll() must NOT start the timer; it should
  // register a listener on the events service and fire the terminal
  // callbacks from there. This is the primary reactivity path
  // post-Phase 3; timer polling is the fallback for SSE-disconnected
  // sessions.

  function eventsBus() {
    const listeners = new Set();
    return {
      connected: true,
      addListener(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      emit(modelName, record) {
        for (const fn of Array.from(listeners)) fn(modelName, record);
      },
      listenerCount() {
        return listeners.size;
      },
    };
  }

  test('poll skips watchRecord when events.connected', function (assert) {
    const bus = eventsBus();
    this.service.events = bus;
    this.service.poll({ id: 'sse-1', reload: () => {} });

    assert.strictEqual(
      this.watchedRecords.length,
      0,
      'no timer-polling when SSE is connected',
    );
    assert.strictEqual(
      bus.listenerCount(),
      1,
      'one SSE listener registered for this record',
    );
  });

  test('SSE listener fires onComplete when record reaches terminal', function (assert) {
    const bus = eventsBus();
    this.service.events = bus;
    let completeFired = false;
    this.service.spinner.begin();
    this.service.poll(
      { id: 'sse-2', reload: () => {} },
      { onComplete: () => (completeFired = true) },
    );

    // Simulate an SSE-driven reload that lands the record terminal.
    bus.emit('score', { id: 'sse-2', status: 'completed' });

    assert.true(completeFired, 'onComplete fired from SSE listener');
    assert.false(this.service.spinner.isShowing, 'spinner ended');
    assert.strictEqual(
      bus.listenerCount(),
      0,
      'listener unsubscribed on terminal',
    );
  });

  test('SSE listener fires onFailed for status=failed', function (assert) {
    const bus = eventsBus();
    this.service.events = bus;
    let failedFired = false;
    this.service.spinner.begin();
    this.service.poll(
      { id: 'sse-3', reload: () => {} },
      { onFailed: () => (failedFired = true) },
    );

    bus.emit('score', { id: 'sse-3', status: 'failed' });

    assert.true(failedFired);
    assert.strictEqual(bus.listenerCount(), 0);
  });

  test('SSE listener ignores events for other records', function (assert) {
    const bus = eventsBus();
    this.service.events = bus;
    let fired = false;
    this.service.poll(
      { id: 'sse-4', reload: () => {} },
      { onComplete: () => (fired = true) },
    );

    bus.emit('score', { id: 'different-id', status: 'completed' });

    assert.false(fired, 'unmatched record id does not fire callback');
    assert.strictEqual(
      bus.listenerCount(),
      1,
      'listener still registered for the actual record',
    );
  });

  test('stop() unsubscribes the SSE listener', function (assert) {
    const bus = eventsBus();
    this.service.events = bus;
    const rec = { id: 'sse-5', reload: () => {} };
    this.service.poll(rec);
    assert.strictEqual(bus.listenerCount(), 1);

    this.service.stop(rec);

    assert.strictEqual(bus.listenerCount(), 0, 'stop revokes the SSE listener');
  });

  test('re-polling the same record does not stack listeners', function (assert) {
    const bus = eventsBus();
    this.service.events = bus;
    const rec = { id: 'sse-6', reload: () => {} };
    this.service.poll(rec);
    this.service.poll(rec);

    assert.strictEqual(
      bus.listenerCount(),
      1,
      'second poll replaces the listener, not appends',
    );
  });
});
