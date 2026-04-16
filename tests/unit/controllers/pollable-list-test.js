import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module('Unit | Controller | pollable-list', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.controller = this.owner.lookup('controller:pollable-list');
    this.controller.recordType = 'score';
    this.stoppedRecords = [];
    // Stub both poller and store before any test runs
    // This prevents real Ember Data store from being hit during willDestroy
    this.fakeStore = {
      peekAll: () => [],
      peekRecord: () => null,
    };
    this.controller.poller = {
      watchRecord: () => {},
      stop: (rec) => {
        this.stoppedRecords.push(rec);
      },
    };
    this.controller.store = this.fakeStore;
  });

  test('it exists', function (assert) {
    assert.ok(this.controller);
  });

  test('isTerminal returns true for terminal statuses', function (assert) {
    assert.true(this.controller.isTerminal({ status: 'completed' }));
    assert.true(this.controller.isTerminal({ status: 'failed' }));
  });

  test('isTerminal returns false for non-terminal statuses', function (assert) {
    assert.false(this.controller.isTerminal({ status: 'pending' }));
  });

  test('pollRecord adds record id to pendingIds', function (assert) {
    this.controller.pollRecord({ id: '42', reload: () => {} });
    assert.true(this.controller.pendingIds.has('42'));
  });

  test('isPending returns true for polled record', function (assert) {
    const rec = { id: '7', reload: () => {} };
    this.controller.pollRecord(rec);
    assert.true(this.controller.isPending(rec));
  });

  test('isPending returns false for non-polled record', function (assert) {
    assert.false(this.controller.isPending({ id: '99' }));
  });

  test('_removePending removes id from pendingIds', function (assert) {
    this.controller.pollRecord({ id: '10', reload: () => {} });
    this.controller.pollRecord({ id: '20', reload: () => {} });
    assert.true(this.controller.pendingIds.has('10'));
    this.controller._removePending('10');
    assert.false(this.controller.pendingIds.has('10'));
    assert.true(this.controller.pendingIds.has('20'), 'other ids unaffected');
  });

  test('willDestroy stops all pending records', function (assert) {
    const fakeRec1 = { id: '1', reload: () => {} };
    const fakeRec2 = { id: '2', reload: () => {} };
    this.controller.store = {
      peekRecord: (type, id) => {
        if (id === '1') return fakeRec1;
        if (id === '2') return fakeRec2;
        return null;
      },
    };
    this.controller.pollRecord(fakeRec1);
    this.controller.pollRecord(fakeRec2);
    this.controller.willDestroy();
    assert.strictEqual(this.stoppedRecords.length, 2, 'both records stopped');
    assert.true(this.stoppedRecords.includes(fakeRec1));
    assert.true(this.stoppedRecords.includes(fakeRec2));
  });
});
