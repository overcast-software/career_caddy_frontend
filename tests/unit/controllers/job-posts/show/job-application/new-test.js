import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module(
  'Unit | Controller | job-posts/show/job-application/new',
  function (hooks) {
    setupTest(hooks);

    // TODO: Replace this with your real tests.
    test('it exists', function (assert) {
      let controller = this.owner.lookup(
        'controller:job-posts/show/job-application/new'
      );
      assert.ok(controller);
    });
  }
);
