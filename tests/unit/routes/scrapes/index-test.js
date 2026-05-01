import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module('Unit | Route | scrapes/index', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:scrapes/index');
    assert.ok(route);
  });

  module('loading action', function () {
    test('self-transition returns false to suppress the loading substate', function (assert) {
      let route = this.owner.lookup('route:scrapes/index');
      route.routeName = 'scrapes.index';
      assert.false(route.loading({ from: { name: 'scrapes.index' } }));
    });

    test('cross-route transition returns true so the loading template renders', function (assert) {
      let route = this.owner.lookup('route:scrapes/index');
      route.routeName = 'scrapes.index';
      assert.true(route.loading({ from: { name: 'caddy' } }));
    });

    test('initial load (transition.from is null) returns true', function (assert) {
      let route = this.owner.lookup('route:scrapes/index');
      route.routeName = 'scrapes.index';
      assert.true(route.loading({ from: null }));
    });
  });
});
