import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import Service from '@ember/service';

// Phase 3 of the ActivityPub-prep plan: reports.dedupe-feedback route
// model() returns the api attributes verbatim, or a forbidden error
// shape when reportFetch resolves with error='forbidden'.

module('Unit | Route | reports/dedupe-feedback', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.origFetch = globalThis.fetch;
    this.owner.register(
      'service:api',
      class extends Service {
        get baseUrl() {
          return 'http://test/api/v1/';
        }
        headers() {
          return { Authorization: 'Bearer test' };
        }
      },
    );
  });

  hooks.afterEach(function () {
    globalThis.fetch = this.origFetch;
  });

  function stubFetch(responder) {
    globalThis.fetch = (url, opts) => Promise.resolve(responder(url, opts));
  }

  test('happy path returns attributes payload', async function (assert) {
    const payload = {
      silent_marks: [{ annotation_id: 1, from_jp_id: 10, to_jp_id: 20 }],
      canonical_unlinks: [],
      promote_pairs: [],
      totals: { silent_marks: 1, canonical_unlinks: 0, promote_pairs: 0 },
    };
    stubFetch(() => ({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { attributes: payload } }),
    }));

    const route = this.owner.lookup('route:reports.dedupe-feedback');
    const result = await route.model();
    assert.deepEqual(result, payload, 'attributes returned verbatim');
  });

  test('403 falls through with error="forbidden" + empty buckets', async function (assert) {
    stubFetch(() => ({
      ok: false,
      status: 403,
      json: () => Promise.resolve({}),
    }));

    const route = this.owner.lookup('route:reports.dedupe-feedback');
    const result = await route.model();
    assert.strictEqual(result.error, 'forbidden');
    assert.deepEqual(result.silent_marks, []);
    assert.deepEqual(result.canonical_unlinks, []);
    assert.deepEqual(result.promote_pairs, []);
    assert.strictEqual(result.totals.silent_marks, 0);
  });
});
