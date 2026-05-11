import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Adapter | screenshot', function (hooks) {
  setupTest(hooks);

  test('urlForQuery routes scrape_id to /scrapes/:id/screenshots/', function (assert) {
    const adapter = this.owner.lookup('adapter:screenshot');
    const url = adapter.urlForQuery({ scrape_id: '162' });
    assert.true(
      url.endsWith('/scrapes/162/screenshots/'),
      `URL ${url} routes to the screenshots sub-collection`,
    );
  });

  test('urlForQuery consumes scrape_id so it does not leak into query params', function (assert) {
    const adapter = this.owner.lookup('adapter:screenshot');
    const query = { scrape_id: '162', other: 'keep-me' };
    adapter.urlForQuery(query);
    assert.notOk('scrape_id' in query);
    assert.strictEqual(query.other, 'keep-me');
  });
});
