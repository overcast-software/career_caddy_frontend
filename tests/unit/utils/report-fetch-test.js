import { module, test } from 'qunit';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

function makeApi() {
  return {
    baseUrl: 'http://test/api/v1/',
    headers() {
      return { Authorization: 'Bearer test-token' };
    },
  };
}

function stubFetch(responder) {
  const calls = [];
  globalThis.fetch = (url, opts) => {
    calls.push({ url, opts });
    return Promise.resolve(responder(url, opts));
  };
  return calls;
}

module('Unit | Utility | report-fetch', function (hooks) {
  hooks.beforeEach(function () {
    this.origFetch = globalThis.fetch;
  });

  hooks.afterEach(function () {
    globalThis.fetch = this.origFetch;
  });

  test('builds /api/v1/<path>/ with trailing slash and Authorization header', async function (assert) {
    const calls = stubFetch(() => ({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { foo: 1 } }),
    }));

    await reportFetch(makeApi(), 'admin/graph-structure');

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(
      calls[0].url,
      'http://test/api/v1/admin/graph-structure/',
    );
    assert.strictEqual(
      calls[0].opts.headers.Authorization,
      'Bearer test-token',
    );
  });

  test('serializes truthy params into query string, drops null/empty', async function (assert) {
    const calls = stubFetch(() => ({
      ok: true,
      json: () => Promise.resolve({ data: null }),
    }));

    await reportFetch(makeApi(), 'reports/sources', {
      scope: 'mine',
      source: 'email',
      from: null,
      to: '',
      user: undefined,
      exclude_stubs: '1',
    });

    const url = new URL(calls[0].url);
    assert.strictEqual(url.searchParams.get('scope'), 'mine');
    assert.strictEqual(url.searchParams.get('source'), 'email');
    assert.strictEqual(url.searchParams.get('exclude_stubs'), '1');
    assert.notOk(url.searchParams.has('from'), 'null param dropped');
    assert.notOk(url.searchParams.has('to'), 'empty-string param dropped');
    assert.notOk(url.searchParams.has('user'), 'undefined param dropped');
  });

  test('returns { data, meta, error: null } on success', async function (assert) {
    stubFetch(() => ({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: { rows: [{ id: 1 }] },
          meta: { total: 1 },
        }),
    }));

    const result = await reportFetch(makeApi(), 'reports/sources');
    assert.deepEqual(result, {
      data: { rows: [{ id: 1 }] },
      meta: { total: 1 },
      error: null,
    });
  });

  test("returns error: 'forbidden' on 403", async function (assert) {
    stubFetch(() => ({ ok: false, status: 403 }));
    const result = await reportFetch(makeApi(), 'reports/sources');
    assert.deepEqual(result, {
      data: null,
      meta: null,
      error: 'forbidden',
    });
  });

  test("returns error: 'failed' on other non-ok", async function (assert) {
    stubFetch(() => ({ ok: false, status: 500 }));
    const result = await reportFetch(makeApi(), 'reports/sources');
    assert.deepEqual(result, {
      data: null,
      meta: null,
      error: 'failed',
    });
  });
});
