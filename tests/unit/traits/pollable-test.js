import { module, test } from 'qunit';
import { setOwner } from '@ember/owner';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { Pollable } from 'career-caddy-frontend/traits/pollable';

// A minimal base class — Pollable(BaseClass) returns a subclass with
// poll / pollIfPending / stopPolling that delegate into the service.
// We don't need a real Ember Data Model for delegation testing.
class FakeRecord {
  constructor(id, status = 'pending') {
    this.id = id;
    this.status = status;
  }
}

module('Unit | Trait | pollable', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    // Stub the service so delegation doesn't fire real setTimeouts.
    this.calls = [];
    const stub = {
      poll: (rec, opts) => {
        this.calls.push(['poll', rec, opts]);
      },
      pollIfPending: (rec, opts) => {
        this.calls.push(['pollIfPending', rec, opts]);
      },
      stop: (rec) => {
        this.calls.push(['stop', rec]);
      },
    };
    this.owner.register(
      'service:pollable',
      class {
        static create() {
          return stub;
        }
      },
    );
  });

  test('Pollable wraps a base class with poll/pollIfPending/stopPolling', function (assert) {
    class Pollable_Fake extends Pollable(FakeRecord) {}
    const instance = new Pollable_Fake('1');
    setOwner(instance, this.owner);

    assert.strictEqual(typeof instance.poll, 'function');
    assert.strictEqual(typeof instance.pollIfPending, 'function');
    assert.strictEqual(typeof instance.stopPolling, 'function');
  });

  test('record.poll delegates to service.poll(this, opts)', function (assert) {
    class Pollable_Fake extends Pollable(FakeRecord) {}
    const instance = new Pollable_Fake('7');
    setOwner(instance, this.owner);

    instance.poll({ longRunning: true });
    assert.deepEqual(this.calls, [['poll', instance, { longRunning: true }]]);
  });

  test('record.pollIfPending delegates with options', function (assert) {
    class Pollable_Fake extends Pollable(FakeRecord) {}
    const instance = new Pollable_Fake('9');
    setOwner(instance, this.owner);

    instance.pollIfPending({ label: 'Foo…', longRunning: false });
    assert.deepEqual(this.calls, [
      ['pollIfPending', instance, { label: 'Foo…', longRunning: false }],
    ]);
  });

  test('record.stopPolling delegates to service.stop(this)', function (assert) {
    class Pollable_Fake extends Pollable(FakeRecord) {}
    const instance = new Pollable_Fake('11');
    setOwner(instance, this.owner);

    instance.stopPolling();
    assert.deepEqual(this.calls, [['stop', instance]]);
  });

  test('Pollable preserves base-class members (multiple inheritance shape)', function (assert) {
    class Base {
      get derivedProp() {
        return 'base-derived';
      }
      baseMethod() {
        return 'base-method';
      }
    }
    class Pollable_Base extends Pollable(Base) {}
    const instance = new Pollable_Base();

    assert.strictEqual(instance.derivedProp, 'base-derived');
    assert.strictEqual(instance.baseMethod(), 'base-method');
    // And the mixin methods are present, so stacking works.
    assert.strictEqual(typeof instance.poll, 'function');
  });
});
