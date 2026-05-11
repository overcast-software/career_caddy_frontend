import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | experience', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('experience', {});
    assert.ok(model, 'model exists');
  });

  module('apiAction verbs', function (hooks) {
    hooks.beforeEach(function () {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('experience');
      this.ajaxCalls = [];
      adapter.ajax = (url, method, options) => {
        this.ajaxCalls.push({ url, method, options });
        return Promise.resolve({ data: null });
      };
    });

    test('reorderDescriptions(ids) POSTs description_ids body to /experiences/:id/reorder-descriptions/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'experience', id: '700', attributes: {} },
      });
      const exp = store.peekRecord('experience', '700');
      await exp.reorderDescriptions([5, 9, 1]);
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith(
          '/experiences/700/reorder-descriptions/',
        ),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.deepEqual(this.ajaxCalls[0].options?.data, {
        description_ids: [5, 9, 1],
      });
    });
  });
});
