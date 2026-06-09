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

    this.owner.register(
      'service:api',
      class extends Service {
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
    stubFetch(() => ({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            nodes: [{ id: 'StartScrape' }, { id: 'LoadProfile' }],
            edges: [{ from: 'StartScrape', to: 'LoadProfile' }],
          },
        }),
    }));

    const route = this.owner.lookup('route:scrapes/graph');
    const result = await route.model({ scrape_id: '496' });

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
});
