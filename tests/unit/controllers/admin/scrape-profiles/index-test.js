import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

// The controller owns the search-state plumbing for
// /admin/scrape-profiles/. Pagination itself is handled by
// <InfinityLoader> + the route's `infinityModel` cache helper; the
// controller's job is just to track the in-flight "Searching…" flash
// and pipe debounced input from <Menus::SubnavSearch> into the
// `search` query param.
module('Unit | Controller | admin/scrape-profiles/index', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/index',
    );
    assert.ok(controller, 'controller resolves');
  });

  test('search is a tracked query param defaulting to empty string', function (assert) {
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/index',
    );
    assert.deepEqual(controller.queryParams, ['search']);
    assert.strictEqual(controller.search, '');
  });

  test('startSearching flips the loading flag on', function (assert) {
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/index',
    );
    assert.notOk(controller.isSearching, 'starts off (undefined is falsy)');
    controller.startSearching();
    assert.true(controller.isSearching, 'flag flipped on');
  });

  test('updateSearch sets the search param and clears the loading flag', function (assert) {
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/index',
    );
    controller.startSearching();
    controller.updateSearch('linkedin');
    assert.strictEqual(controller.search, 'linkedin', 'search param updated');
    assert.false(
      controller.isSearching,
      'loading flag cleared after the debounce fires',
    );
  });

  test('updateSearch with an empty string clears the search', function (assert) {
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/index',
    );
    controller.updateSearch('linkedin');
    controller.updateSearch('');
    assert.strictEqual(
      controller.search,
      '',
      'empty string resets the param so the route refetches page 1 unfiltered',
    );
  });
});
