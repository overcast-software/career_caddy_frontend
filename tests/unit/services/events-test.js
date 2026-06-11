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

  test('_handleMessage cascades scrape reload to parent job-post', async function (assert) {
    // The api updates JobPost columns (description, title, company,
    // etc.) when a scrape parses successfully, but the backend emits
    // only a `scrape` event on the channel. The events service has
    // to cascade the reload so jp.show templates rendering
    // model.description re-render without manual navigation.
    const scrape = {
      reload() {
        this.reloads.push(this);
        return Promise.resolve(this);
      },
      reloads: this.reloads,
      belongsTo(name) {
        if (name !== 'jobPost') return { id: () => null };
        return { id: () => '99' };
      },
    };
    const jobPost = makeRecord(this.reloads);
    this.records.set('scrape:7', scrape);
    this.records.set('job-post:99', jobPost);

    this.service._handleMessage({
      data: JSON.stringify({
        type: 'scrape',
        id: 7,
        status: 'completed',
        user_id: 1,
      }),
    });

    // Drain microtasks so the .then() that fires _cascadeReload runs.
    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(this.reloads.length, 2, 'scrape + parent reload');
    assert.strictEqual(this.reloads[0], scrape, 'scrape reloaded first');
    assert.strictEqual(this.reloads[1], jobPost, 'job-post reloaded after');
  });

  test('_handleMessage skips job-post cascade when parent is not in store', async function (assert) {
    // Same as above but the user is on a page that has the scrape
    // loaded without the parent JobPost in the store (e.g. an admin
    // scrape view). The cascade peekRecord misses and we skip — no
    // prefetch of records the user didn't ask for.
    const scrape = {
      reload() {
        this.reloads.push(this);
        return Promise.resolve(this);
      },
      reloads: this.reloads,
      belongsTo() {
        return { id: () => '99' };
      },
    };
    this.records.set('scrape:7', scrape);
    // Intentionally no job-post:99.

    this.service._handleMessage({
      data: JSON.stringify({
        type: 'scrape',
        id: 7,
        status: 'completed',
        user_id: 1,
      }),
    });

    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(this.reloads.length, 1, 'only scrape reloaded');
  });

  test('_handleMessage does not cascade for non-scrape events', async function (assert) {
    // A score event must not trigger a job-post reload even if the
    // score is wired to a job-post — the cascade is scoped to scrape
    // events only (where the backend known-mutates JobPost columns).
    const score = makeRecord(this.reloads);
    const jobPost = makeRecord(this.reloads);
    this.records.set('score:42', score);
    this.records.set('job-post:99', jobPost);

    this.service._handleMessage({
      data: JSON.stringify({
        type: 'score',
        id: 42,
        status: 'completed',
        user_id: 7,
      }),
    });

    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(this.reloads.length, 1, 'only score reloaded');
    assert.strictEqual(this.reloads[0], score);
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
