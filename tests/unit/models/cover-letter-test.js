import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | cover letter', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('cover-letter', {});
    assert.ok(model, 'model exists');
  });
});
