import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

module('Unit | Service | pollable', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.service = this.owner.lookup('service:pollable');
    this.watchedRecords = [];
    this.stoppedRecords = [];
    this.service.poller = {
      watchRecord: (rec, opts) => {
        this.watchedRecords.push({ rec, opts });
      },
      stop: (rec) => {
        this.stoppedRecords.push(rec);
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

  test('poll passes onUpdate to poller.watchRecord', function (assert) {
    const onUpdate = () => {};
    this.service.poll({ id: '1', reload: () => {} }, { onUpdate });
    assert.strictEqual(this.watchedRecords[0].opts.onUpdate, onUpdate);
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

  test('stop removes pending and stops poller', function (assert) {
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
});
