import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | company', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('company', {});
    assert.ok(model, 'model exists');
  });

  module('apiAction verbs', function (hooks) {
    hooks.beforeEach(function () {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('company');
      this.ajaxCalls = [];
      adapter.ajax = (url, method, options) => {
        this.ajaxCalls.push({ url, method, options });
        return Promise.resolve({ data: null });
      };
    });

    test('mergeInto(targetId) POSTs target_id to /companies/:id/merge-into/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'company', id: '700', attributes: { name: 'Source' } },
      });
      const company = store.peekRecord('company', '700');
      await company.mergeInto(42);
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/companies/700/merge-into/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.deepEqual(this.ajaxCalls[0].options?.data, { target_id: 42 });
    });

    test('unmarkAsAliasOf() POSTs with no payload to /companies/:id/unmark-as-alias-of/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'company', id: '710', attributes: { name: 'Aliased' } },
      });
      const company = store.peekRecord('company', '710');
      await company.unmarkAsAliasOf();
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/companies/710/unmark-as-alias-of/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.strictEqual(
        this.ajaxCalls[0].options,
        undefined,
        'no body — unmark verb takes no payload',
      );
    });
  });
});
