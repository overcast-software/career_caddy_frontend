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

  function makeRecord(reloads, reloadOptions) {
    return {
      reload(options) {
        reloads.push(this);
        // Capture the reload options the service passed in so tests
        // can assert on ?include= sideload requests.
        if (reloadOptions) reloadOptions.push(options);
        // The service now chains .then() onto reload() to fire post-
        // reload listener notifications, so the stub must return a
        // Promise — undefined would throw a TypeError mid-handler.
        return Promise.resolve(this);
      },
    };
  }

  test('_handleMessage reloads the matching record', async function (assert) {
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

    // reload() fires synchronously inside _handleMessage; the .then()
    // chain that notifies listeners is async, so the assertion checks
    // the immediate reload call rather than waiting on the promise.
    assert.strictEqual(this.reloads.length, 1, 'reload fired once');
    assert.strictEqual(this.reloads[0], rec, 'on the matching record');
  });

  test('_handleMessage maps cover_letter to cover-letter model', async function (assert) {
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

  test('_handleMessage reload passes ?include=job-post for scrape events', function (assert) {
    // A completed scrape's api response writes back to the parent
    // JobPost (description, title, company, link, etc.) but the
    // SSE channel only emits a `scrape` event. The service asks the
    // adapter to sideload the parent via JSON:API ?include=job-post
    // so Ember Data auto-pushes the JobPost from `included[]` and
    // every template reading model.description re-renders without
    // navigation or a manual peekRecord cascade.
    const reloadOptions = [];
    const rec = makeRecord(this.reloads, reloadOptions);
    this.records.set('scrape:7', rec);

    this.service._handleMessage({
      data: JSON.stringify({
        type: 'scrape',
        id: 7,
        status: 'completed',
        user_id: 1,
      }),
    });

    assert.strictEqual(this.reloads.length, 1, 'scrape reloaded once');
    assert.deepEqual(
      reloadOptions[0],
      { include: 'job-post' },
      'reload called with ?include=job-post sideload',
    );
  });

  test('_handleMessage reload passes no options for non-scrape events', function (assert) {
    // Score / summary / cover_letter / answer / resume don't have a
    // known parent the api known-mutates on transition, so reload
    // stays a bare GET — no speculative include payload, no extra
    // sideload work on the api.
    const reloadOptions = [];
    const rec = makeRecord(this.reloads, reloadOptions);
    this.records.set('score:42', rec);

    this.service._handleMessage({
      data: JSON.stringify({
        type: 'score',
        id: 42,
        status: 'completed',
        user_id: 7,
      }),
    });

    assert.strictEqual(this.reloads.length, 1, 'score reloaded once');
    assert.strictEqual(
      reloadOptions[0],
      undefined,
      'reload called without options for non-scrape types',
    );
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
