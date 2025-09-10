import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

module('Unit | Route | companies/show', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:companies/show');
    assert.ok(route);
  });
});
