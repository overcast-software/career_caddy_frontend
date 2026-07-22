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

  module('topScoreValue', function () {
    test('returns null when no scores are loaded', function (assert) {
      const store = this.owner.lookup('service:store');
      const jp = store.createRecord('job-post', {});
      assert.strictEqual(jp.topScoreValue, null);
    });

    test('ignores pending scores — column stays "—" while scoring', function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: [
          {
            type: 'job-post',
            id: '200',
            attributes: {},
            relationships: {
              scores: { data: [{ type: 'score', id: 's1' }] },
            },
          },
          {
            type: 'score',
            id: 's1',
            attributes: { status: 'pending', score: null },
            relationships: {
              jobPost: { data: { type: 'job-post', id: '200' } },
            },
          },
        ],
      });
      const jp = store.peekRecord('job-post', '200');
      assert.strictEqual(
        jp.topScoreValue,
        null,
        'a pending score contributes no value',
      );
    });

    test('returns the highest completed score', function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: [
          {
            type: 'job-post',
            id: '201',
            attributes: {},
            relationships: {
              scores: {
                data: [
                  { type: 'score', id: 's2' },
                  { type: 'score', id: 's3' },
                ],
              },
            },
          },
          {
            type: 'score',
            id: 's2',
            attributes: { status: 'completed', score: 71 },
            relationships: {
              jobPost: { data: { type: 'job-post', id: '201' } },
            },
          },
          {
            type: 'score',
            id: 's3',
            attributes: { status: 'completed', score: 88 },
            relationships: {
              jobPost: { data: { type: 'job-post', id: '201' } },
            },
          },
        ],
      });
      const jp = store.peekRecord('job-post', '201');
      assert.strictEqual(jp.topScoreValue, 88, 'picks the max completed score');
    });

    // The regression this fix targets: a score that completes AFTER the
    // JobPost was loaded (the SSE events service reloads the Score record,
    // never the parent JobPost, so `topScore` belongsTo linkage never
    // updates). Deriving off the `scores` hasMany makes the index cell
    // live-update the same way jp.show's scores table does.
    test('live-updates when a pending score flips to completed (SSE path)', function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: [
          {
            type: 'job-post',
            id: '202',
            attributes: {},
            relationships: {
              scores: { data: [{ type: 'score', id: 's4' }] },
            },
          },
          {
            type: 'score',
            id: 's4',
            attributes: { status: 'pending', score: null },
            relationships: {
              jobPost: { data: { type: 'job-post', id: '202' } },
            },
          },
        ],
      });
      const jp = store.peekRecord('job-post', '202');
      assert.strictEqual(jp.topScoreValue, null, 'starts unscored');

      // Simulate the SSE score-completion reload: the Score record's
      // attributes update in place (no JobPost reload, no topScore relink).
      store.push({
        data: {
          type: 'score',
          id: 's4',
          attributes: { status: 'completed', score: 93 },
        },
      });
      assert.strictEqual(
        jp.topScoreValue,
        93,
        'derived value tracks the in-place score reload',
      );
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

    test('markDuplicateOf({target_id}) POSTs to /job-posts/:id/mark-duplicate-of/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'job-post', id: '81', attributes: {} },
      });
      const jp = store.peekRecord('job-post', '81');
      await jp.markDuplicateOf({ target_id: 99 });
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/job-posts/81/mark-duplicate-of/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.deepEqual(this.ajaxCalls[0].options?.data, { target_id: 99 });
    });

    test('markDuplicateOf forwards field_overrides + relation untouched', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'job-post', id: '82', attributes: {} },
      });
      const jp = store.peekRecord('job-post', '82');
      await jp.markDuplicateOf({
        target_id: 100,
        field_overrides: { title: 'A', description: 'B' },
        relation: 'repost',
      });
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.deepEqual(this.ajaxCalls[0].options?.data, {
        target_id: 100,
        field_overrides: { title: 'A', description: 'B' },
        relation: 'repost',
      });
    });
  });

  module('Phase C — repost relation', function () {
    test('repostedFromId attr is exposed for the show-page pill', function (assert) {
      const store = this.owner.lookup('service:store');
      // store.push expects JSON:API normalized attrs — camelCase keys
      // matching the @attr property name on the model.
      store.push({
        data: {
          type: 'job-post',
          id: '90',
          attributes: { repostedFromId: 42 },
        },
      });
      const jp = store.peekRecord('job-post', '90');
      assert.strictEqual(jp.repostedFromId, 42);
    });

    test('repostedFrom belongsTo resolves to the referenced JP', function (assert) {
      const store = this.owner.lookup('service:store');
      // Relationship key matches the camelCase property name on the
      // model, not the dasherized JSON:API wire format. The serializer
      // dasherizes on outbound writes; store.push is post-normalize.
      store.push({
        data: [
          { type: 'job-post', id: '91', attributes: {} },
          {
            type: 'job-post',
            id: '92',
            attributes: {},
            relationships: {
              repostedFrom: { data: { type: 'job-post', id: '91' } },
            },
          },
        ],
      });
      const repost = store.peekRecord('job-post', '92');
      const original = repost.belongsTo('repostedFrom').value();
      assert.ok(original, 'live belongsTo resolves without await');
      assert.strictEqual(original.id, '91');
    });

    test('reposts hasMany is reachable via the reverse FK', function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: [
          {
            type: 'job-post',
            id: '93',
            attributes: {},
            relationships: {
              reposts: {
                data: [
                  { type: 'job-post', id: '94' },
                  { type: 'job-post', id: '95' },
                ],
              },
            },
          },
          { type: 'job-post', id: '94', attributes: {} },
          { type: 'job-post', id: '95', attributes: {} },
        ],
      });
      const original = store.peekRecord('job-post', '93');
      const reposts = original.hasMany('reposts').value() || [];
      const ids = [];
      for (const r of reposts) ids.push(r.id);
      assert.deepEqual(ids.sort(), ['94', '95']);
      assert.strictEqual(original.repostsCount, 2);
    });

    test('repostsCount falls back to 0 when relationship has not loaded', function (assert) {
      const store = this.owner.lookup('service:store');
      const jp = store.createRecord('job-post', {});
      assert.strictEqual(jp.repostsCount, 0);
    });
  });
});
