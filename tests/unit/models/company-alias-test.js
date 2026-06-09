import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | company-alias', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('company-alias', {});
    assert.ok(model, 'model exists');
  });

  test('exposes the documented attributes', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('company-alias', {
      name: 'Acme Corp',
      nameSlug: 'acme',
      source: 'extraction',
    });
    assert.strictEqual(model.name, 'Acme Corp');
    assert.strictEqual(model.nameSlug, 'acme');
    assert.strictEqual(model.source, 'extraction');
  });
});
