import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | scrape', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('scrape', {});
    assert.ok(model, 'model exists');
  });
});
