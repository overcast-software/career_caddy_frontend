import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { EVENT_TYPES } from 'career-caddy-frontend/services/events';

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
    // Audited against the api's terminal writes (2026-08-26):
    // score / summary / cover_letter / answer each write only their own
    // row, so nothing else in the store goes stale and a bare GET is a
    // complete reload. jp.index's Score column reads the derived
    // `JobPost#topScoreValue` off the live `scores` ManyArray this
    // reload refreshes, not the `topScore` belongsTo — so it updates
    // without a sideload. No speculative include payload, no extra
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

  // ── EVENT_TYPES is the whole spec of what SSE keeps fresh ─────────
  //
  // The three constants this replaced (handled-types Set, type→model
  // map, sparse sideload map) let a type be handled while no sideload
  // decision existed for it anywhere — the omission was invisible.
  // These two tests are the enforcement: a new row cannot be added
  // without answering both questions, and a hostile `type` off the
  // wire cannot resolve through Object.prototype.

  test('every handled event type declares both a model and an explicit sideload decision', function (assert) {
    for (const [type, spec] of EVENT_TYPES) {
      assert.strictEqual(
        typeof spec.model,
        'string',
        `${type} declares an Ember Data model name`,
      );
      assert.true(
        'include' in spec,
        `${type} declares include — null is an audited "nothing else goes stale", a missing key is a gap`,
      );
      const includeKind = spec.include === null ? 'null' : typeof spec.include;
      assert.ok(
        ['null', 'string'].includes(includeKind),
        `${type} include is null or a JSON:API include string (got ${includeKind})`,
      );
    }
  });

  test('_handleMessage ignores event types that name Object.prototype members', function (assert) {
    // EVENT_TYPES is a Map for this reason. As a plain object,
    // `EVENT_TYPES['constructor']` is a truthy function and the guard
    // would wave the frame through into peekRecord(undefined, ...).
    const rec = makeRecord(this.reloads);
    this.records.set('constructor:1', rec);

    for (const type of ['constructor', 'toString', '__proto__']) {
      this.service._handleMessage({
        data: JSON.stringify({ type, id: 1, status: 'completed' }),
      });
    }

    assert.strictEqual(this.reloads.length, 0, 'no reload, no throw');
  });

  test('stop() is idempotent and clears state', function (assert) {
    // Without an open EventSource, stop should still flip _stopped and
    // not throw.
    this.service.stop();
    this.service.stop();
    assert.false(this.service.connected);
    assert.strictEqual(this.service._eventSource, null);
  });

  // ── Reconnect backoff ──────────────────────────────────────────────
  //
  // Regression cover for the 2026-08 retry storm. A proxy misroute made
  // /api/v1/events/token/ return 404 on every call. The backoff existed but
  // nothing was subject to it: start() guarded only on _eventSource, which
  // is never assigned when the token fetch fails, so each call re-entered
  // _connect() immediately. The result was a request every few seconds per
  // open tab — ~70% of all production traffic and a budget alert.
  //
  // These tests pin the two properties that make that impossible: start()
  // respects a pending backoff, and the backoff only resets on evidence the
  // stream actually works.

  module('reconnect backoff', function (hooks) {
    class FakeEventSource {
      static last = null;
      constructor(url) {
        this.url = url;
        this.closed = false;
        FakeEventSource.last = this;
      }
      close() {
        this.closed = true;
      }
    }

    hooks.beforeEach(function () {
      this.origFetch = globalThis.fetch;
      this.origEventSource = globalThis.EventSource;
      FakeEventSource.last = null;
      globalThis.EventSource = FakeEventSource;

      this.service.session = { isAuthenticated: true };
      this.service.api = { url: (p) => p, headers: () => ({}) };

      this.fetchCalls = 0;
      this.tokenOk = false;
      globalThis.fetch = async () => {
        this.fetchCalls += 1;
        return this.tokenOk
          ? { ok: true, json: async () => ({ token: 'tok' }) }
          : { ok: false, status: 404 };
      };
    });

    hooks.afterEach(function () {
      this.service.stop();
      globalThis.fetch = this.origFetch;
      globalThis.EventSource = this.origEventSource;
    });

    // Drain one backoff step without waiting on a real timer.
    function stepBackoff(service) {
      service._scheduleReconnect();
      clearTimeout(service._retryTimer);
      service._retryTimer = null;
    }

    test('repeated start() calls do not bypass a pending backoff', async function (assert) {
      await this.service.start();
      assert.strictEqual(this.fetchCalls, 1, 'first start mints once');
      assert.ok(this.service._retryTimer, 'a retry is pending after the 404');

      await this.service.start();
      await this.service.start();
      await this.service.start();

      assert.strictEqual(
        this.fetchCalls,
        1,
        'further start() calls are absorbed by the pending backoff',
      );
    });

    test('backoff grows monotonically while the endpoint keeps failing', function (assert) {
      const seen = [];
      for (let i = 0; i < 5; i++) {
        seen.push(this.service._reconnectMs);
        stepBackoff(this.service);
      }
      assert.deepEqual(
        seen,
        [1000, 2000, 4000, 8000, 16000],
        'each failure doubles the delay',
      );
    });

    test('backoff is capped so a dead endpoint cannot be hammered', function (assert) {
      for (let i = 0; i < 40; i++) stepBackoff(this.service);
      assert.strictEqual(
        this.service._reconnectMs,
        300_000,
        'ceiling is 5 minutes, not 30 seconds',
      );
    });

    test('a connection that opens then drops does NOT reset the backoff', async function (assert) {
      this.tokenOk = true;
      await this.service.start();
      const es = FakeEventSource.last;
      assert.ok(es, 'stream opened');

      // Back the service off as if several attempts had already failed.
      this.service._reconnectMs = 16_000;

      es.onopen();
      assert.strictEqual(
        this.service._reconnectMs,
        16_000,
        'opening alone is not evidence of health',
      );

      es.onerror();
      assert.strictEqual(
        this.service._reconnectMs,
        32_000,
        'a flap before the stability window ADVANCES the backoff, never resets it — this is the exact case the old onopen reset defeated',
      );
      assert.strictEqual(this.service._eventSource, null, 'stream cleared');
    });

    test('a delivered frame resets the backoff', async function (assert) {
      this.tokenOk = true;
      await this.service.start();
      const es = FakeEventSource.last;

      this.service._reconnectMs = 16_000;
      es.onopen();
      es.onmessage({ data: JSON.stringify({ type: 'score', id: 1 }) });

      assert.strictEqual(
        this.service._reconnectMs,
        1000,
        'a real frame proves the pipe works end to end',
      );
    });

    test('the token is minted against the api path, not the stream path', async function (assert) {
      // The 404 came from /api/v1/events/token/ being proxied to the events
      // service. Pin the path the client asks for so a rename here has to be
      // matched deliberately in docker-entrypoint.d/10-api-proxy.sh.
      let requested = null;
      this.service.api = {
        url: (p) => {
          if (!requested) requested = p;
          return p;
        },
        headers: () => ({}),
      };
      await this.service.start();
      assert.strictEqual(requested, '/api/v1/events/token/');
    });
  });
});
