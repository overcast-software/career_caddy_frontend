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
    // Stub the events service. poll() now exclusively goes through
    // the SSE listener path (timer-polling was retired 2026-05-30).
    // The per-test "eventsBus()" helper below builds a richer stub
    // for tests that need to emit events and inspect the listener
    // count; this beforeEach default keeps the simpler tests happy.
    this.listeners = new Set();
    this.service.events = {
      connected: true,
      addListener: (fn) => {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
      },
    };
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

  test('pollIfPending skips terminal records', function (assert) {
    this.service.pollIfPending({ id: '1', status: 'completed' });
    assert.strictEqual(this.listeners.size, 0);
    assert.false(this.service.spinner.isShowing);
  });

  test('pollIfPending starts spinner and registers SSE listener', function (assert) {
    this.service.pollIfPending(
      { id: '2', status: 'pending', reload: () => {} },
      { label: 'Testing…' },
    );
    assert.strictEqual(this.listeners.size, 1);
    assert.true(this.service.spinner.isShowing);
    assert.strictEqual(this.service.spinner.label, 'Testing…');
  });

  test('pollIfPending no-ops if record already pending', function (assert) {
    const rec = { id: '3', status: 'pending', reload: () => {} };
    this.service.poll(rec);
    const countBefore = this.service.spinner._count;
    this.service.pollIfPending(rec, { label: 'Again…' });
    assert.strictEqual(this.listeners.size, 1, 'no extra listener registered');
    assert.strictEqual(
      this.service.spinner._count,
      countBefore,
      'spinner count unchanged',
    );
  });

  test('stop removes pending and unsubscribes the listener', function (assert) {
    const rec = { id: '5', status: 'pending', reload: () => {} };
    this.service.spinner.begin();
    this.service.poll(rec);
    assert.strictEqual(this.listeners.size, 1);
    this.service.stop(rec);
    assert.false(this.service.pendingIds.has('5'));
    assert.strictEqual(this.listeners.size, 0);
  });

  // ── SSE listener behavior ──────────────────────────────────────────
  // poll() now exclusively registers an SSE listener; timer polling
  // was retired. These tests cover what the listener does on each
  // emitted event for the watched record.

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

  test('poll registers exactly one SSE listener', function (assert) {
    const bus = eventsBus();
    this.service.events = bus;
    this.service.poll({ id: 'sse-1', status: 'pending', reload: () => {} });
    assert.strictEqual(bus.listenerCount(), 1);
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
