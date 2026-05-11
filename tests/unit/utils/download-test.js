import { module, test } from 'qunit';
import { downloadResource } from 'career-caddy-frontend/utils/download';

// Minimal stand-ins. We exercise downloadResource directly — it
// only touches: adapter.buildURL, session.authorizationHeader,
// fetch, document.createElement, URL.createObjectURL, and
// window.location.assign.
function makeAdapter() {
  return {
    buildURL(modelName, id) {
      return `/api/v1/${modelName}s/${id}/`;
    },
  };
}

function makeSession({ token } = {}) {
  return { authorizationHeader: token ? `Bearer ${token}` : null };
}

function stubFetch(responder) {
  const calls = [];
  globalThis.fetch = (url, opts) => {
    calls.push({ url, opts });
    return Promise.resolve(responder(url, opts));
  };
  return calls;
}

module('Unit | Utility | download', function (hooks) {
  hooks.beforeEach(function () {
    this.origFetch = globalThis.fetch;
    this.origCreate = URL.createObjectURL;
    this.origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:fake';
    URL.revokeObjectURL = () => {};
  });

  hooks.afterEach(function () {
    globalThis.fetch = this.origFetch;
    URL.createObjectURL = this.origCreate;
    URL.revokeObjectURL = this.origRevoke;
  });

  test('binary docx response triggers a blob download', async function (assert) {
    const calls = stubFetch(() => ({
      ok: true,
      headers: {
        get: () =>
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      blob: () => Promise.resolve(new Blob(['x'])),
    }));

    const result = await downloadResource({
      adapter: makeAdapter(),
      session: makeSession({ token: 'abc' }),
      modelName: 'cover-letter',
      id: '7',
      path: 'export',
      filename: 'cover-letter-7.docx',
    });

    assert.deepEqual(result, { kind: 'blob' });
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].url, '/api/v1/cover-letters/7/export');
    assert.strictEqual(calls[0].opts.method, 'GET');
    assert.strictEqual(calls[0].opts.headers.Authorization, 'Bearer abc');
  });

  test('JSON {url} response redirects via injected navigate()', async function (assert) {
    stubFetch(() => ({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ url: 'https://s3.example/file.docx' }),
    }));
    const navigated = [];
    const result = await downloadResource({
      adapter: makeAdapter(),
      session: makeSession(),
      modelName: 'cover-letter',
      id: '8',
      path: 'export',
      filename: 'cover-letter-8.docx',
      navigate: (u) => navigated.push(u),
    });
    assert.deepEqual(result, {
      kind: 'redirect',
      url: 'https://s3.example/file.docx',
    });
    assert.deepEqual(navigated, ['https://s3.example/file.docx']);
  });

  test('non-ok response throws', async function (assert) {
    stubFetch(() => ({
      ok: false,
      status: 500,
      headers: { get: () => '' },
    }));
    let thrown;
    try {
      await downloadResource({
        adapter: makeAdapter(),
        session: makeSession(),
        modelName: 'cover-letter',
        id: '9',
        path: 'export',
        filename: 'cover-letter-9.docx',
      });
    } catch (e) {
      thrown = e;
    }
    assert.ok(thrown, 'rejection on non-ok status');
    assert.true(/500/.test(thrown.message), 'message includes status');
  });

  test('omits Authorization header when session has no token', async function (assert) {
    const calls = stubFetch(() => ({
      ok: true,
      headers: {
        get: () =>
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      blob: () => Promise.resolve(new Blob(['x'])),
    }));
    await downloadResource({
      adapter: makeAdapter(),
      session: makeSession(),
      modelName: 'cover-letter',
      id: '10',
      path: 'export',
      filename: 'cover-letter-10.docx',
    });
    assert.notOk(
      calls[0].opts.headers.Authorization,
      'no Authorization header when unauthenticated',
    );
  });
});
