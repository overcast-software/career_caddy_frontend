import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module(
  'Unit | Route | job-applications/show/questions/index',
  function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
      let route = this.owner.lookup(
        'route:job-applications/show/questions/index'
      );
      assert.ok(route);
    });
  }
);
