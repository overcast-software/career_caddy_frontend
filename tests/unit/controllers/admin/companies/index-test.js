import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

// The controller owns the search-state plumbing for /admin/companies/.
// Pagination itself is handled by <InfinityLoader> + the route's
// `infinityModel` cache helper; the controller's job is just to track
// the in-flight "Searching…" flash and pipe debounced input from
// <Menus::SubnavSearch> into the `search` query param.
module('Unit | Controller | admin/companies/index', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const controller = this.owner.lookup('controller:admin/companies/index');
    assert.ok(controller, 'controller resolves');
  });

  test('search is a tracked query param defaulting to empty string', function (assert) {
    const controller = this.owner.lookup('controller:admin/companies/index');
    assert.deepEqual(controller.queryParams, ['search']);
    assert.strictEqual(controller.search, '');
  });

  test('startSearching flips the loading flag on', function (assert) {
    const controller = this.owner.lookup('controller:admin/companies/index');
    assert.false(controller.isSearching, 'starts off');
    controller.startSearching();
    assert.true(controller.isSearching, 'flag flipped on');
  });

  test('updateSearch sets the search param and clears the loading flag', function (assert) {
    const controller = this.owner.lookup('controller:admin/companies/index');
    controller.startSearching();
    controller.updateSearch('acme');
    assert.strictEqual(controller.search, 'acme', 'search param updated');
    assert.false(
      controller.isSearching,
      'loading flag cleared after the debounce fires',
    );
  });

  test('updateSearch with an empty string clears the search', function (assert) {
    const controller = this.owner.lookup('controller:admin/companies/index');
    controller.updateSearch('acme');
    controller.updateSearch('');
    assert.strictEqual(
      controller.search,
      '',
      'empty string resets the param so the route refetches page 1 unfiltered',
    );
  });
});
