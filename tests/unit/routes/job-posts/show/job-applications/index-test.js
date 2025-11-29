import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module(
  'Unit | Route | job-posts/show/job-applications/index',
  function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
      let route = this.owner.lookup(
        'route:job-posts/show/job-applications/index'
      );
      assert.ok(route);
    });
  }
);
