import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import Service from '@ember/service';

// Regression: ScrapeStatusModel records returned from store.query come
// back as an AdapterPopulatedRecordArray. In Ember Data 5+ that array
// no longer exposes .toArray(), so the old `traceResult.toArray?.()`
// silently produced an empty list and `<ScrapeGraph::Dagre>` rendered
// the structure with no visited path. The route now uses Array.from()
// to compose the snake_case trace POJOs the dagre component expects.

module('Unit | Route | scrapes/graph', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.origFetch = globalThis.fetch;

    // reportFetch composes `${api.baseUrl}${path}/` — baseUrl, not
    // api.url(). Keep url() on the stub anyway so the fixture matches
    // the real service's surface.
    this.owner.register(
      'service:api',
      class extends Service {
        baseUrl = 'http://test/api/v1/';
        url(path) {
          return `http://test${path}`;
        }
        headers() {
          return { Authorization: 'Bearer test' };
        }
      },
    );

    // Stub the store with a query() that returns an iterable result
    // mimicking AdapterPopulatedRecordArray (no .toArray method,
    // exposes .meta, iterable via [Symbol.iterator]).
    const records = [
      {
        graphNode: 'StartScrape',
        graphPayload: { routed_to: 'LoadProfile', duration_ms: 12 },
        note: null,
        createdAt: new Date('2026-06-09T12:00:00Z'),
        belongsTo() {
          return { id: () => '496' };
        },
      },
      {
        graphNode: 'LoadProfile',
        graphPayload: { routed_to: 'Navigate', duration_ms: 5 },
        note: null,
        createdAt: new Date('2026-06-09T12:00:01Z'),
        belongsTo() {
          return { id: () => '496' };
        },
      },
    ];
    const recordArrayLike = {
      meta: { chain: [{ id: '495', source: 'redirect' }] },
      [Symbol.iterator]() {
        return records[Symbol.iterator]();
      },
    };

    this.owner.register(
      'service:store',
      class extends Service {
        query() {
          return Promise.resolve(recordArrayLike);
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

  test('composes trace POJOs from the iterable record array', async function (assert) {
    const requested = [];
    globalThis.fetch = (url, opts) => {
      requested.push(url);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              nodes: [{ id: 'StartScrape' }, { id: 'LoadProfile' }],
              edges: [{ from: 'StartScrape', to: 'LoadProfile' }],
            },
          }),
        _opts: opts,
      });
    };

    const route = this.owner.lookup('route:scrapes/graph');
    const result = await route.model({ scrape_id: '496' });

    // The structure GET goes through reportFetch (bucket 4) now. It used
    // to be a raw fetch behind a `KEEP raw fetch:` note whose stated
    // reason — "would need a typed report client" — was already obsolete
    // when it was written: reportFetch IS that client, and
    // app/routes/admin/scrape-graph.js calls this same endpoint through it.
    assert.deepEqual(
      requested,
      ['http://test/api/v1/admin/graph-structure/'],
      'one GET, composed from api.baseUrl by reportFetch',
    );
    assert.strictEqual(result.scrapeId, '496', 'scrapeId passed through');
    assert.strictEqual(result.trace.length, 2, 'trace not silently empty');
    assert.deepEqual(
      result.trace[0],
      {
        scrape_id: '496',
        graph_node: 'StartScrape',
        graph_payload: { routed_to: 'LoadProfile', duration_ms: 12 },
        note: null,
        created_at: '2026-06-09T12:00:00.000Z',
      },
      'first trace row shape matches ScrapeGraph::Dagre contract',
    );
    assert.strictEqual(
      result.trace[1].graph_node,
      'LoadProfile',
      'second trace row in order',
    );
    assert.deepEqual(
      result.chain,
      [{ id: '495', source: 'redirect' }],
      'meta.chain forwarded from record array',
    );
    assert.ok(
      result.structure.nodes.length,
      'graph structure forwarded from admin endpoint',
    );
  });

  test('empty trace when store.query rejects', async function (assert) {
    this.owner.unregister('service:store');
    this.owner.register(
      'service:store',
      class extends Service {
        query() {
          return Promise.reject(new Error('boom'));
        }
      },
    );
    stubFetch(() => ({
      ok: true,
      json: () => Promise.resolve({ data: { nodes: [], edges: [] } }),
    }));

    const route = this.owner.lookup('route:scrapes/graph');
    const result = await route.model({ scrape_id: '999' });

    assert.deepEqual(result.trace, [], 'trace is empty on query rejection');
    assert.deepEqual(result.chain, [], 'chain is empty on query rejection');
  });

  // The structure panel degrades to an empty graph rather than failing
  // the whole route — the trace is the point of this page and it comes
  // from a different request. reportFetch covers the non-ok half
  // (returns {data: null}); the .catch in the route covers the network
  // rejection half, which reportFetch lets through.

  test('empty structure when the admin endpoint returns non-ok', async function (assert) {
    stubFetch(() => ({ ok: false, status: 500 }));

    const route = this.owner.lookup('route:scrapes/graph');
    const result = await route.model({ scrape_id: '496' });

    assert.deepEqual(result.structure, { nodes: [], edges: [] });
    assert.strictEqual(result.trace.length, 2, 'the trace still renders');
  });

  test('empty structure when the structure request rejects outright', async function (assert) {
    globalThis.fetch = () => Promise.reject(new Error('offline'));

    const route = this.owner.lookup('route:scrapes/graph');
    const result = await route.model({ scrape_id: '496' });

    assert.deepEqual(result.structure, { nodes: [], edges: [] });
    assert.strictEqual(result.trace.length, 2, 'the trace still renders');
  });
});
