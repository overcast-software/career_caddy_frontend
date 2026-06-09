import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

// /admin/companies/ adopts the same infinite-scroll + query-param
// search shape that /companies/index uses. The loading-substate
// suppression is critical: without it, an in-route refresh from a
// debounced search would tear down + remount the search input
// (no <:subnav> slot in index-loading.hbs) and lose focus.
module('Unit | Route | admin/companies/index', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const route = this.owner.lookup('route:admin/companies/index');
    assert.ok(route);
  });

  module('loading action', function () {
    test('self-transition returns false to suppress the loading substate', function (assert) {
      const route = this.owner.lookup('route:admin/companies/index');
      route.routeName = 'admin.companies.index';
      assert.false(route.loading({ from: { name: 'admin.companies.index' } }));
    });

    test('cross-route transition returns true so the loading template renders', function (assert) {
      const route = this.owner.lookup('route:admin/companies/index');
      route.routeName = 'admin.companies.index';
      assert.true(route.loading({ from: { name: 'admin.index' } }));
    });

    test('initial load (transition.from is null) returns true', function (assert) {
      const route = this.owner.lookup('route:admin/companies/index');
      route.routeName = 'admin.companies.index';
      assert.true(route.loading({ from: null }));
    });
  });

  test('queryParams declares search as a refreshModel param', function (assert) {
    const route = this.owner.lookup('route:admin/companies/index');
    assert.true(
      route.queryParams.search.refreshModel,
      'search refreshes the model so a new query fires page 1',
    );
  });
});
