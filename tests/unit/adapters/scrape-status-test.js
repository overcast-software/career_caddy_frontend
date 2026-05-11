import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Adapter | scrape-status', function (hooks) {
  setupTest(hooks);

  test('urlForQuery routes scrape_id to /scrapes/:id/graph-trace/', function (assert) {
    const adapter = this.owner.lookup('adapter:scrape-status');
    const url = adapter.urlForQuery({ scrape_id: '162' });
    assert.true(
      url.endsWith('/scrapes/162/graph-trace/'),
      `URL ${url} routes to the graph-trace sub-collection`,
    );
  });

  test('urlForQuery deletes scrape_id from the query after routing', function (assert) {
    const adapter = this.owner.lookup('adapter:scrape-status');
    const query = { scrape_id: '162', other: 'keep-me' };
    adapter.urlForQuery(query);
    assert.notOk(
      'scrape_id' in query,
      'scrape_id is consumed so it does not leak into query params',
    );
    assert.strictEqual(query.other, 'keep-me');
  });
});
