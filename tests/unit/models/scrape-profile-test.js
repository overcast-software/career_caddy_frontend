import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | scrape profile', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('scrape-profile', {});
    assert.ok(model, 'model exists');
  });

  module('successRatePercent', function () {
    test('rounds successRate fraction to whole percent', function (assert) {
      const store = this.owner.lookup('service:store');
      const profile = store.createRecord('scrape-profile', {
        successRate: 0.834,
      });
      assert.strictEqual(profile.successRatePercent, 83);
    });

    test('returns 0 when successRate is null', function (assert) {
      const store = this.owner.lookup('service:store');
      const profile = store.createRecord('scrape-profile', {
        successRate: null,
      });
      assert.strictEqual(profile.successRatePercent, 0);
    });
  });

  module('apiAction verbs', function (hooks) {
    hooks.beforeEach(function () {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('scrape-profile');
      this.ajaxCalls = [];
      adapter.ajax = (url, method, options) => {
        this.ajaxCalls.push({ url, method, options });
        return Promise.resolve({ data: null });
      };
    });

    test('sharpen() POSTs to /scrape-profiles/:id/sharpen/ with force=false default', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'scrape-profile', id: '12', attributes: {} },
      });
      const profile = store.peekRecord('scrape-profile', '12');
      await profile.sharpen();
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/scrape-profiles/12/sharpen/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.deepEqual(this.ajaxCalls[0].options?.data, { force: false });
    });

    test('sharpen({force: true}) forwards force flag in the body', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'scrape-profile', id: '13', attributes: {} },
      });
      const profile = store.peekRecord('scrape-profile', '13');
      await profile.sharpen({ force: true });
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.deepEqual(this.ajaxCalls[0].options?.data, { force: true });
    });
  });
});
