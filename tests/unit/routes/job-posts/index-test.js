import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module('Unit | Route | job-posts/index', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:job-posts/index');
    assert.ok(route);
  });

  // Regression: returning the wrong booleans here makes the search input
  // flicker on every keystroke (loading substate tears down the subnav).
  // Self-transition must return false (suppress *-loading.hbs); cold
  // loads must return true (bubble → skeleton renders).
  module('loading action', function () {
    test('self-transition returns false to suppress the loading substate', function (assert) {
      let route = this.owner.lookup('route:job-posts/index');
      route.routeName = 'job-posts.index';
      assert.false(route.loading({ from: { name: 'job-posts.index' } }));
    });

    test('cross-route transition returns true so the loading template renders', function (assert) {
      let route = this.owner.lookup('route:job-posts/index');
      route.routeName = 'job-posts.index';
      assert.true(route.loading({ from: { name: 'caddy' } }));
    });

    test('initial load (transition.from is null) returns true', function (assert) {
      let route = this.owner.lookup('route:job-posts/index');
      route.routeName = 'job-posts.index';
      assert.true(route.loading({ from: null }));
    });
  });
});
