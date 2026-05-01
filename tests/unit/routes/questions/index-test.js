import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module('Unit | Route | questions/index', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:questions/index');
    assert.ok(route);
  });

  module('loading action', function () {
    test('self-transition returns false to suppress the loading substate', function (assert) {
      let route = this.owner.lookup('route:questions/index');
      route.routeName = 'questions.index';
      assert.false(route.loading({ from: { name: 'questions.index' } }));
    });

    test('cross-route transition returns true so the loading template renders', function (assert) {
      let route = this.owner.lookup('route:questions/index');
      route.routeName = 'questions.index';
      assert.true(route.loading({ from: { name: 'caddy' } }));
    });

    test('initial load (transition.from is null) returns true', function (assert) {
      let route = this.owner.lookup('route:questions/index');
      route.routeName = 'questions.index';
      assert.true(route.loading({ from: null }));
    });
  });
});
