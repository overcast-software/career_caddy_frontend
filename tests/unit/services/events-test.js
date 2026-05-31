import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module('Unit | Service | events', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.service = this.owner.lookup('service:events');

    // Stub the store with a peekRecord that records its calls and
    // returns either a stand-in record (with a reload spy) or null.
    this.reloads = [];
    this.records = new Map();
    this.service.store = {
      peekRecord: (modelName, id) => {
        const key = `${modelName}:${id}`;
        return this.records.get(key) ?? null;
      },
    };
  });

  function makeRecord(reloads) {
    return {
      reload() {
        reloads.push(this);
      },
    };
  }

  test('_handleMessage reloads the matching record', function (assert) {
    const rec = makeRecord(this.reloads);
    this.records.set('score:42', rec);

    this.service._handleMessage({
      data: JSON.stringify({
        type: 'score',
        id: 42,
        status: 'completed',
        user_id: 7,
      }),
    });

    assert.strictEqual(this.reloads.length, 1, 'reload fired once');
    assert.strictEqual(this.reloads[0], rec, 'on the matching record');
  });

  test('_handleMessage maps cover_letter to cover-letter model', function (assert) {
    const rec = makeRecord(this.reloads);
    this.records.set('cover-letter:5', rec);

    this.service._handleMessage({
      data: JSON.stringify({
        type: 'cover_letter',
        id: 5,
        status: 'completed',
        user_id: 7,
      }),
    });

    assert.strictEqual(
      this.reloads.length,
      1,
      'snake_case event type maps to dasherized model name',
    );
  });

  test('_handleMessage skips when record not in store', function (assert) {
    // peekRecord returns null — the page never loaded this score, so
    // reloading would prefetch a record the user didn't ask for.
    this.service._handleMessage({
      data: JSON.stringify({
        type: 'score',
        id: 999,
        status: 'completed',
        user_id: 7,
      }),
    });

    assert.strictEqual(
      this.reloads.length,
      0,
      'no reload when record is not in store',
    );
  });

  test('_handleMessage ignores unknown event types', function (assert) {
    const rec = makeRecord(this.reloads);
    this.records.set('mystery:1', rec);

    this.service._handleMessage({
      data: JSON.stringify({
        type: 'mystery',
        id: 1,
        status: 'completed',
      }),
    });

    assert.strictEqual(this.reloads.length, 0);
  });

  test('_handleMessage tolerates malformed JSON', function (assert) {
    // Should not throw.
    this.service._handleMessage({ data: 'not-json' });
    this.service._handleMessage({ data: '' });
    this.service._handleMessage({});
    assert.ok(true, 'no exception');
  });

  test('_handleMessage ignores payloads missing id', function (assert) {
    this.service._handleMessage({
      data: JSON.stringify({ type: 'score', status: 'completed' }),
    });
    assert.strictEqual(this.reloads.length, 0);
  });

  test('stop() is idempotent and clears state', function (assert) {
    // Without an open EventSource, stop should still flip _stopped and
    // not throw.
    this.service.stop();
    this.service.stop();
    assert.false(this.service.connected);
    assert.strictEqual(this.service._eventSource, null);
  });
});
