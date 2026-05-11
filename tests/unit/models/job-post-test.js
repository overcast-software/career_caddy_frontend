import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | job post', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('job-post', {});
    assert.ok(model, 'model exists');
  });

  module('urlAliases', function () {
    test('returns a single canonical entry when only link is set', function (assert) {
      const store = this.owner.lookup('service:store');
      const jp = store.createRecord('job-post', {
        link: 'https://example.com/x',
      });
      const aliases = jp.urlAliases;
      assert.strictEqual(aliases.length, 1);
      assert.strictEqual(aliases[0].url, 'https://example.com/x');
      assert.strictEqual(aliases[0].label, 'Canonical');
      assert.strictEqual(aliases[0].hostname, 'example.com');
    });

    test('skips applyUrl when applyUrlStatus is not "resolved"', function (assert) {
      const store = this.owner.lookup('service:store');
      const jp = store.createRecord('job-post', {
        link: 'https://example.com/x',
        applyUrl: 'https://apply.example.com/x',
        applyUrlStatus: 'failed',
      });
      const urls = jp.urlAliases.map((a) => a.url);
      assert.deepEqual(urls, ['https://example.com/x']);
    });

    test("includes resolved applyUrl + each scrape url/sourceLink, dedup'd", function (assert) {
      const store = this.owner.lookup('service:store');
      const jp = store.createRecord('job-post', {
        link: 'https://www.dice.com/job-detail/X',
        canonicalLink: 'https://www.dice.com/job-detail/X',
        applyUrl: 'https://careers.unitedhealthgroup.com/job/X',
        applyUrlStatus: 'resolved',
      });
      // Two scrapes: one with the canonical URL (dedup target) and a
      // tracker sourceLink, another with overlapping URLs.
      store.createRecord('scrape', {
        jobPost: jp,
        url: 'https://www.dice.com/job-detail/X',
        sourceLink: 'https://jobright.ai/track/abc',
      });
      store.createRecord('scrape', {
        jobPost: jp,
        url: 'https://www.dice.com/job-detail/X',
        sourceLink: 'https://jobright.ai/track/abc',
      });

      const urls = jp.urlAliases.map((a) => a.url);
      assert.deepEqual(
        urls,
        [
          'https://www.dice.com/job-detail/X',
          'https://careers.unitedhealthgroup.com/job/X',
          'https://jobright.ai/track/abc',
        ],
        'each distinct URL appears exactly once',
      );

      const labels = jp.urlAliases.map((a) => a.label);
      assert.deepEqual(labels, ['Canonical', 'Apply', 'Tracker']);
    });

    test('canonicalLink renders as a separate alias only when it differs from link', function (assert) {
      const store = this.owner.lookup('service:store');
      const jp = store.createRecord('job-post', {
        link: 'https://example.com/redirect',
        canonicalLink: 'https://example.com/canonical',
      });
      const urls = jp.urlAliases.map((a) => a.url);
      assert.deepEqual(urls, [
        'https://example.com/redirect',
        'https://example.com/canonical',
      ]);
    });
  });

  module('apiAction verbs', function (hooks) {
    hooks.beforeEach(function () {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('job-post');
      this.ajaxCalls = [];
      adapter.ajax = (url, method, options) => {
        this.ajaxCalls.push({ url, method, options });
        return Promise.resolve({ data: null });
      };
    });

    test('resolveAndDedupe() POSTs to /job-posts/:id/resolve-and-dedupe/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'job-post', id: '77', attributes: {} },
      });
      const jp = store.peekRecord('job-post', '77');
      await jp.resolveAndDedupe();
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/job-posts/77/resolve-and-dedupe/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
    });

    test('nuclearDelete() DELETEs to /job-posts/:id/nuclear/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'job-post', id: '78', attributes: {} },
      });
      const jp = store.peekRecord('job-post', '78');
      await jp.nuclearDelete();
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'DELETE');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/job-posts/78/nuclear/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
    });

    test('submitTriage(payload) POSTs payload as body to /job-posts/:id/triage/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'job-post', id: '79', attributes: {} },
      });
      const jp = store.peekRecord('job-post', '79');
      await jp.submitTriage({
        status: 'Vetted Bad',
        reason_code: 'duplicate',
      });
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/job-posts/79/triage/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.deepEqual(this.ajaxCalls[0].options?.data, {
        status: 'Vetted Bad',
        reason_code: 'duplicate',
      });
    });

    test('reextract({text}) POSTs text as body to /job-posts/:id/reextract/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'job-post', id: '80', attributes: {} },
      });
      const jp = store.peekRecord('job-post', '80');
      await jp.reextract({ text: 'pasted job description' });
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/job-posts/80/reextract/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.deepEqual(this.ajaxCalls[0].options?.data, {
        text: 'pasted job description',
      });
    });
  });
});
