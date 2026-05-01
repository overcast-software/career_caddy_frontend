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
});
