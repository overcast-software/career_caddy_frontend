import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import Service from '@ember/service';

// Regression: tracker URLs (e.g. governmentjobs.com search-redirect)
// produce a parent Scrape with no JobPost. The canonical child scrape
// owns the JobPost. /scrapes/:id used to render no JobPost / Company
// when the user landed on the tracker. The route now walks the
// child-scrape chain so the show page surfaces the canonical record.

module('Unit | Route | scrapes/show', function (hooks) {
  setupTest(hooks);

  function makeScrape({ id, jobPost = null, children = [] }) {
    return {
      id,
      jobPost: Promise.resolve(jobPost),
      scrapes: Promise.resolve(children),
    };
  }

  function stubStore(owner, findRecordImpl) {
    owner.unregister?.('service:store');
    owner.register(
      'service:store',
      class extends Service {
        findRecord(...args) {
          return findRecordImpl(...args);
        }
      },
    );
  }

  test('walks child chain to the canonical scrape with a JobPost', async function (assert) {
    // scrape 334 = tracker (no jobPost) -> child scrape 335 = canonical
    // (jobPost 1735). /scrapes/334 must surface JobPost 1735.
    const jobPost = { id: '1735', title: 'Senior Software Engineer' };
    const canonical = makeScrape({ id: '335', jobPost });
    const tracker = makeScrape({ id: '334', children: [canonical] });

    stubStore(this.owner, (modelName, id) => {
      assert.strictEqual(modelName, 'scrape', 'queries the scrape model');
      assert.strictEqual(id, '334', 'requests the tracker scrape id');
      return Promise.resolve(tracker);
    });

    const route = this.owner.lookup('route:scrapes/show');
    const result = await route.model({ scrape_id: '334' });

    assert.strictEqual(result.scrape, tracker, 'hash carries the tracker');
    assert.strictEqual(
      result.canonicalScrape,
      canonical,
      'canonicalScrape is the descended child',
    );
    assert.strictEqual(
      result.jobPost,
      jobPost,
      'JobPost is the canonical scrape’s JobPost',
    );
  });

  test('no walk needed when the scrape already owns the JobPost', async function (assert) {
    const jobPost = { id: '1000', title: 'Direct hit' };
    const direct = makeScrape({ id: '900', jobPost });

    stubStore(this.owner, () => Promise.resolve(direct));

    const route = this.owner.lookup('route:scrapes/show');
    const result = await route.model({ scrape_id: '900' });

    assert.strictEqual(
      result.scrape,
      direct,
      'hash carries the requested scrape',
    );
    assert.strictEqual(
      result.canonicalScrape,
      direct,
      'canonicalScrape is the scrape itself when JobPost is already attached',
    );
    assert.strictEqual(result.jobPost, jobPost, 'JobPost surfaced directly');
  });

  test('broken chain: no JobPost anywhere, returns nulls without error', async function (assert) {
    const leaf = makeScrape({ id: '337' }); // no jobPost, no children
    const middle = makeScrape({ id: '336', children: [leaf] });
    const root = makeScrape({ id: '334', children: [middle] });

    stubStore(this.owner, () => Promise.resolve(root));

    const route = this.owner.lookup('route:scrapes/show');
    const result = await route.model({ scrape_id: '334' });

    assert.strictEqual(result.scrape, root, 'hash carries the root scrape');
    assert.strictEqual(
      result.canonicalScrape,
      null,
      'canonicalScrape is null when no leaf owns a JobPost',
    );
    assert.strictEqual(
      result.jobPost,
      null,
      'jobPost is null when chain dead-ends',
    );
  });

  test('chain walk halts on cycle without spinning forever', async function (assert) {
    // Defense in depth — if the api ever emits a cycle, the walk
    // should bail rather than hang the route. Build a 2-node cycle
    // and assert model() resolves with nulls.
    const a = makeScrape({ id: '500' });
    const b = makeScrape({ id: '501' });
    // Patch children to form a cycle: a -> b -> a
    a.scrapes = Promise.resolve([b]);
    b.scrapes = Promise.resolve([a]);

    stubStore(this.owner, () => Promise.resolve(a));

    const route = this.owner.lookup('route:scrapes/show');
    const result = await route.model({ scrape_id: '500' });

    assert.strictEqual(result.scrape, a, 'hash carries the requested scrape');
    assert.strictEqual(
      result.canonicalScrape,
      null,
      'cycle does not invent a canonical',
    );
    assert.strictEqual(result.jobPost, null, 'cycle does not invent a JobPost');
  });
});
