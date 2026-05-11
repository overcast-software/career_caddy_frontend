import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';
import ScrapeModel from 'career-caddy-frontend/models/scrape';

module('Unit | Model | scrape', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('scrape', {});
    assert.ok(model, 'model exists');
  });

  module('apiAction verbs', function (hooks) {
    hooks.beforeEach(function () {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('scrape');
      this.ajaxCalls = [];
      adapter.ajax = (url, method, options) => {
        this.ajaxCalls.push({ url, method, options });
        return Promise.resolve({ data: null });
      };
    });

    test('parse() POSTs to /scrapes/:id/parse/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'scrape', id: '500', attributes: {} },
      });
      const scrape = store.peekRecord('scrape', '500');
      await scrape.parse();
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/scrapes/500/parse/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
    });

    test('redo() POSTs to /scrapes/:id/redo/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'scrape', id: '501', attributes: {} },
      });
      const scrape = store.peekRecord('scrape', '501');
      await scrape.redo();
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/scrapes/501/redo/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
    });

    test('Scrape.fromText(store, payload) POSTs body to /scrapes/from-text/', async function (assert) {
      const store = this.owner.lookup('service:store');
      await ScrapeModel.fromText(store, {
        text: 'pasted',
        link: 'https://example.com/job',
      });
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/scrapes/from-text/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.deepEqual(this.ajaxCalls[0].options?.data, {
        text: 'pasted',
        link: 'https://example.com/job',
      });
    });
  });
});
