import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module('Unit | Controller | pollable', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let controller = this.owner.lookup('controller:pollable');
    assert.ok(controller);
  });

  test('isTerminal returns true for terminal statuses', function (assert) {
    let controller = this.owner.lookup('controller:pollable');
    assert.true(controller.isTerminal({ status: 'completed' }));
    assert.true(controller.isTerminal({ status: 'done' }));
    assert.true(controller.isTerminal({ status: 'failed' }));
    assert.true(controller.isTerminal({ status: 'error' }));
  });

  test('isTerminal returns false for non-terminal statuses', function (assert) {
    let controller = this.owner.lookup('controller:pollable');
    assert.false(controller.isTerminal({ status: 'pending' }));
    assert.false(controller.isTerminal({ status: 'running' }));
    assert.false(controller.isTerminal({ status: 'hold' }));
    assert.false(controller.isTerminal({ status: undefined }));
  });

  test('startPollingIfPending does nothing when model status is terminal', function (assert) {
    let controller = this.owner.lookup('controller:pollable');
    let watchCalled = false;
    controller.poller = {
      watchRecord: () => {
        watchCalled = true;
      },
      stop: () => {},
    };
    controller.model = { status: 'completed' };
    controller.startPollingIfPending();
    assert.false(
      watchCalled,
      'watchRecord should not be called for terminal status',
    );
  });

  test('startPollingIfPending calls poller.watchRecord for non-terminal status', function (assert) {
    let controller = this.owner.lookup('controller:pollable');
    let watchedRecord = null;
    controller.poller = {
      watchRecord: (rec) => {
        watchedRecord = rec;
      },
      stop: () => {},
    };
    const fakeModel = { status: 'pending' };
    controller.model = fakeModel;
    controller.startPollingIfPending();
    assert.strictEqual(
      watchedRecord,
      fakeModel,
      'watchRecord called with the model',
    );
  });

  test('stopPolling calls poller.stop on the tracked record', function (assert) {
    let controller = this.owner.lookup('controller:pollable');
    let stoppedRecord = null;
    controller.poller = {
      watchRecord: () => {},
      stop: (rec) => {
        stoppedRecord = rec;
      },
    };
    const fakeModel = { status: 'pending' };
    controller.model = fakeModel;
    controller.startPollingIfPending();
    controller.stopPolling();
    assert.strictEqual(
      stoppedRecord,
      fakeModel,
      'poller.stop called with the record',
    );
    assert.strictEqual(controller._polledRecord, null, '_polledRecord cleared');
  });

  test('stopPolling is a no-op when nothing is being polled', function (assert) {
    let controller = this.owner.lookup('controller:pollable');
    let stopCalled = false;
    controller.poller = {
      stop: () => {
        stopCalled = true;
      },
    };
    controller.stopPolling();
    assert.false(stopCalled, 'poller.stop should not be called');
  });
});
