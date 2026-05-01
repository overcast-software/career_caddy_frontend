import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module('Unit | Route | job-applications/index', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:job-applications/index');
    assert.ok(route);
  });

  module('loading action', function () {
    test('self-transition returns false to suppress the loading substate', function (assert) {
      let route = this.owner.lookup('route:job-applications/index');
      route.routeName = 'job-applications.index';
      assert.false(route.loading({ from: { name: 'job-applications.index' } }));
    });

    test('cross-route transition returns true so the loading template renders', function (assert) {
      let route = this.owner.lookup('route:job-applications/index');
      route.routeName = 'job-applications.index';
      assert.true(route.loading({ from: { name: 'caddy' } }));
    });

    test('initial load (transition.from is null) returns true', function (assert) {
      let route = this.owner.lookup('route:job-applications/index');
      route.routeName = 'job-applications.index';
      assert.true(route.loading({ from: null }));
    });
  });
});
