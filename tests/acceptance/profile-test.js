import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, currentURL, settled } from '@ember/test-helpers';
import { invalidateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';

// CC #51 — public /<username> profile page. The route loads against the REAL
// models via two AllowAny endpoints (api PR #195):
//   • queryRecord('user', { username })     → GET /users/:username/
//   • query('job-post', { username, page }) → GET /users/:username/job-posts/federated/ (keyset)
// The controller accumulates keyset pages (page[after]=<meta.next_cursor>) as
// the visitor scrolls.
//
// Per the project acceptance convention (resolve-and-dedupe-test.js /
// mark-incomplete-test.js) we mock at the STORE boundary with a StoreStub
// rather than at the network, so the adapter URL-mapping isn't network-
// exercised. The POJOs mirror the model's camelCase attribute surface
// (displayName / companyName / postedDate …) that the template reads.
//
// Controllable per test:
//   userResult / userShouldReject → the user lookup result, or a 404 reject.
//   page1 / page1Cursor           → first federated page + its next_cursor.
//   page2                         → the page returned for any page[after] query.
class StoreStub extends Service {
  userResult = { displayName: 'Dough Boy', username: 'dough' };
  userShouldReject = false;
  page1 = [];
  page1Cursor = null;
  page2 = [];
  // Captures the `username` the route passed into the user lookup, so a test
  // can assert the route normalized '@dough' → 'dough' BEFORE the query (CC #67).
  lastUserUsername = null;

  queryRecord(modelName, query) {
    if (modelName === 'user') {
      this.lastUserUsername = query?.username ?? null;
      if (this.userShouldReject) {
        return Promise.reject(new Error('not found'));
      }
      return Promise.resolve(this.userResult);
    }
    return Promise.resolve(null);
  }

  query(modelName, query) {
    if (modelName === 'job-post') {
      const after = query?.page?.after;
      const records = after ? [...this.page2] : [...this.page1];
      // Mirror store.query's AdapterPopulatedRecordArray.meta — the keyset
      // cursor rides in JSON:API top-level meta. Page 2 is the last page here.
      records.meta = { next_cursor: after ? null : this.page1Cursor };
      return Promise.resolve(records);
    }
    return Promise.resolve([]);
  }

  // Defensive no-ops mirroring the other acceptance StoreStubs.
  async findRecord() {
    return null;
  }
  peekRecord() {
    return null;
  }
  async findAll() {
    return [];
  }
  peekAll() {
    return [];
  }
  unloadAll() {}
}

module('Acceptance | public profile page', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.owner.unregister('service:store');
    this.owner.register('service:store', StoreStub);
    this.store = this.owner.lookup('service:store');

    // CC-105 — the application-flow funnel is a bucket-4 report fetched via
    // reportFetch → globalThis.fetch (NOT Ember Data), so we mock at the
    // network boundary here, not the store. This drives the REAL data path:
    // reportFetch parses `payload.data.attributes` and the controller/template
    // render it — no normalization is faked (the trap an earlier StoreStub-POJO
    // approach fell into). `flowAttributes` defaults to an EMPTY flow (the
    // non-rich steady state) so the pre-existing feed tests show no chart; a
    // test overrides it to exercise the populated chart. Non-funnel requests
    // (healthcheck, session) pass through to the real fetch unchanged.
    this.flowAttributes = {
      nodes: [],
      links: [],
      total_job_posts: 0,
      total_applications: 0,
      scope: 'public_profile',
    };
    this.lastFlowRequest = null;
    this.origFetch = window.fetch;
    const self = this;
    window.fetch = function (url, opts) {
      if (typeof url === 'string' && url.includes('/application-flow/')) {
        self.lastFlowRequest = { url, opts: opts || {} };
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              data: {
                type: 'report',
                id: 'application-flow',
                attributes: self.flowAttributes,
              },
            }),
        });
      }
      return self.origFetch.call(this, url, opts);
    };
  });

  hooks.afterEach(function () {
    window.fetch = this.origFetch;
  });

  test('a logged-out visitor can load /dough without an auth redirect, chromeless', async function (assert) {
    this.store.page1 = [];
    await invalidateSession();
    await visit('/dough');

    assert.strictEqual(
      currentURL(),
      '/dough',
      'stayed on /dough — route is public, no redirect to /login',
    );
    assert.dom('h1').hasText('Dough Boy', 'header shows the display name');
    assert.dom('header p').hasText('@dough', 'header shows the @username');
    assert
      .dom('.course-sidebar')
      .doesNotExist(
        'public profile renders chromeless — no authenticated app sidebar',
      );
  });

  test('the Mastodon-style /@dough resolves the same profile as /dough (leading @ stripped)', async function (assert) {
    // CC #67 / BACK #94 — visiting /@dough used to pass the raw '@dough' param
    // into the user lookup (GET /users/%40dough/ → 404 → not-found state) and
    // render the doubled handle '@@dough'. The route now strips the leading '@'
    // before the query AND in the returned model.username.
    this.store.page1 = [];
    await invalidateSession();
    await visit('/@dough');

    assert.strictEqual(
      currentURL(),
      '/@dough',
      'stayed on /@dough — route is public, no redirect',
    );
    assert.strictEqual(
      this.store.lastUserUsername,
      'dough',
      'leading @ stripped before the lookup (GET /users/dough/, not /users/%40dough/)',
    );
    assert
      .dom('h1')
      .hasText(
        'Dough Boy',
        '/@dough resolves the same user record as /dough — not the not-found state',
      );
    assert
      .dom('header p')
      .hasText('@dough', 'the handle renders a single @, not @@dough');
  });

  test('published posts render with title, company, location, date, and link', async function (assert) {
    this.store.page1 = [
      {
        id: '1',
        title: 'Staff Engineer',
        companyName: 'Acme Corp',
        location: 'Remote',
        postedDate: new Date('2026-05-15T00:00:00Z'),
        link: 'https://example.com/jobs/1',
        createdAt: new Date('2026-06-01T12:00:00Z'),
      },
    ];
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('li a')
      .hasText('Staff Engineer', 'post title renders as a link');
    assert
      .dom('li a')
      .hasAttribute(
        'href',
        'https://example.com/jobs/1',
        'links to the posting',
      );
    assert.dom('li').includesText('Acme Corp', 'company name renders');
    assert.dom('li').includesText('Remote', 'location renders');
    assert
      .dom('li time')
      .exists('a posted/created date renders as a <time> element');
  });

  test('the rich card renders a Vetted Good verdict, score bucket, and applied badge (FRON-121)', async function (assert) {
    // The owner-opted-in RICH federated projection inlines verdict (via
    // meta.triage), score (0-100), and applied onto each public job-post. The
    // read-only <Profile::PostCard> renders them as null-safe pills.
    this.store.page1 = [
      {
        id: 'aB3dEf7gH9',
        title: 'Staff Engineer',
        companyName: 'Acme Corp',
        location: 'Remote',
        link: 'https://example.com/jobs/7',
        triage: { status: 'Vetted Good', reason_code: null, note: null },
        score: 87,
        applied: true,
      },
    ];
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('[data-test-verdict]')
      .includesText('Vetted good', 'a Vetted Good verdict pill renders');
    assert
      .dom('[data-test-verdict]')
      .includesText('✅', 'the good verdict carries the ✅ marker');
    assert
      .dom('[data-test-score]')
      .hasText(
        'Strong match (87)',
        'a score of 87 renders the Strong-match bucket label + raw number',
      );
    assert
      .dom('[data-test-applied]')
      .hasText('Applied', 'the applied badge renders when applied is true');
  });

  test('a Vetted Bad verdict shows the reason label but never the free-text note (FRON-121)', async function (assert) {
    this.store.page1 = [
      {
        id: 'Zy9Xw8Vu7T',
        title: 'Backend Role',
        link: 'https://example.com/jobs/8',
        // note must NEVER reach a public surface — the projection nulls it,
        // and the card reads reason_code (label) only.
        triage: {
          status: 'Vetted Bad',
          reason_code: 'compensation',
          note: 'lowball offer, recruiter was rude',
        },
        score: 55,
        applied: false,
      },
    ];
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('[data-test-verdict]')
      .includesText(
        'Vetted bad (Compensation)',
        'the Vetted Bad pill shows the reason LABEL',
      );
    assert
      .dom('[data-test-verdict]')
      .includesText('❌', 'the bad verdict carries the ❌ marker');
    assert
      .dom('[data-test-score]')
      .hasText('Long shot (55)', 'a sub-60 score renders the Long-shot bucket');
    assert
      .dom('[data-test-applied]')
      .doesNotExist('no applied badge when applied is false');
    assert
      .dom('li')
      .doesNotIncludeText(
        'lowball offer',
        'the free-text vetting note never leaks onto the public card',
      );
  });

  test('the rich pills drop entirely when verdict/score/applied are absent (null-safe, FRON-121)', async function (assert) {
    // A public post with none of the rich signals must show fewer pills, never
    // a "None" placeholder. The title + link still render.
    this.store.page1 = [
      {
        id: 'Qw3Er5Ty7U',
        title: 'Plain Posting',
        link: 'https://example.com/jobs/9',
      },
    ];
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('[data-test-post-link]')
      .hasText('Plain Posting', 'the title still renders as an outbound link');
    assert.dom('[data-test-verdict]').doesNotExist('no verdict pill');
    assert.dom('[data-test-score]').doesNotExist('no score pill');
    assert.dom('[data-test-applied]').doesNotExist('no applied pill');
    assert
      .dom('li')
      .doesNotIncludeText('None', 'absent signals drop — never render "None"');
  });

  test('the rich pills render from per-resource meta.federation (CC-104)', async function (assert) {
    // The api emits the owner's signals under per-resource `meta.federation`
    // (frozen wire contract: { verdict, verdict_reason_code, score, applied }).
    // The application serializer lifts per-resource meta onto attributes, so it
    // arrives as a `federation` object; the card reads it FIRST. Here there is
    // no flat triage/score/applied — only `federation` — proving the new path.
    this.store.page1 = [
      {
        id: 'Fe3dRa7Te9',
        title: 'Staff Engineer',
        companyName: 'Acme Corp',
        location: 'Remote',
        link: 'https://example.com/jobs/10',
        federation: {
          verdict: 'Vetted Good',
          verdict_reason_code: null,
          score: 87,
          applied: true,
        },
      },
    ];
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('[data-test-verdict]')
      .includesText(
        'Vetted good',
        'verdict pill renders from meta.federation.verdict',
      );
    assert
      .dom('[data-test-score]')
      .hasText(
        'Strong match (87)',
        'score pill renders from meta.federation.score',
      );
    assert
      .dom('[data-test-applied]')
      .hasText(
        'Applied',
        'applied pill renders from meta.federation.applied === true',
      );
  });

  test('meta.federation Vetted Bad surfaces the reason label, never the note (CC-104)', async function (assert) {
    // verdict_reason_code drives the label; the projection never emits the
    // free-text note, and the card has no channel to render it.
    this.store.page1 = [
      {
        id: 'Fe5dBa8Du7',
        title: 'Backend Role',
        link: 'https://example.com/jobs/11',
        federation: {
          verdict: 'Vetted Bad',
          verdict_reason_code: 'compensation',
          score: 55,
          applied: false,
        },
      },
    ];
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('[data-test-verdict]')
      .includesText(
        'Vetted bad (Compensation)',
        'the reason LABEL comes from meta.federation.verdict_reason_code',
      );
    assert
      .dom('[data-test-score]')
      .hasText('Long shot (55)', 'a sub-60 federation score buckets Long shot');
    assert
      .dom('[data-test-applied]')
      .doesNotExist('no applied pill when meta.federation.applied is false');
  });

  test('a known user with no public posts shows the empty state', async function (assert) {
    this.store.page1 = [];
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('h2')
      .hasText(
        'No published posts yet',
        'empty state renders for a user with no audience-public posts',
      );
  });

  test('an unknown username degrades to the not-found state (no login bounce)', async function (assert) {
    this.store.userShouldReject = true;
    await invalidateSession();
    await visit('/dough');

    assert.strictEqual(currentURL(), '/dough', 'no redirect — stayed public');
    assert
      .dom('h1')
      .hasText('Profile not found', 'user 404 degrades to the not-found state');
  });

  test('scrolling loads the next keyset page and appends it', async function (assert) {
    this.store.page1 = [
      { id: '1', title: 'Post One', link: 'https://example.com/jobs/1' },
    ];
    this.store.page1Cursor = 'cursor-abc';
    this.store.page2 = [
      { id: '2', title: 'Post Two', link: 'https://example.com/jobs/2' },
    ];
    await invalidateSession();
    await visit('/dough');

    // Drive the sentinel deterministically (IntersectionObserver visibility in
    // the test container is unreliable): invoke the controller action directly.
    const controller = this.owner.lookup('controller:profile');
    controller.loadMore();
    await settled();

    assert
      .dom('li')
      .exists(
        { count: 2 },
        'page 2 is appended to page 1 via spread (not replaced)',
      );
    assert.dom('li:first-child').includesText('Post One', 'page-1 post kept');
    assert
      .dom('li:last-child')
      .includesText(
        'Post Two',
        'page-2 post appended after the cursor advance',
      );
  });

  test('a rich profile renders the application-flow Sankey above the post cards (CC-105)', async function (assert) {
    // The AllowAny funnel endpoint returns a populated flow for an opted-in
    // (federate_rich) profile. The route reads it via reportFetch (the
    // window.fetch stub above returns this `type:report` envelope); the
    // controller feeds data.attributes nodes/links to the read-only Sankey,
    // rendered at the top of the page.
    this.flowAttributes = {
      nodes: [
        { id: 'job_posts' },
        { id: 'applications' },
        { id: 'applied' },
        { id: 'interview' },
      ],
      links: [
        { source: 0, target: 1, value: 5 },
        { source: 1, target: 2, value: 5 },
        { source: 2, target: 3, value: 3 },
      ],
      total_job_posts: 7,
      total_applications: 5,
      scope: 'public_profile',
    };
    this.store.page1 = [
      { id: '1', title: 'Staff Engineer', link: 'https://example.com/jobs/1' },
    ];
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('[data-test-profile-flow]')
      .exists('the public funnel section renders for a rich profile');
    assert
      .dom('[data-test-profile-flow] svg .sankey-nodes')
      .exists('the Sankey chart renders inside the funnel section');
    assert
      .dom('[data-test-sankey-error]')
      .doesNotExist('the clean DAG payload renders without an error banner');
    assert.dom('li').exists('the post cards still render below the chart');

    // The funnel fetch went to the AllowAny endpoint for this username.
    assert.ok(
      this.lastFlowRequest?.url.includes('/users/dough/application-flow/'),
      'the funnel was fetched from /users/dough/application-flow/',
    );

    // DOM order: the funnel section precedes the post list.
    const flowEl = this.element.querySelector('[data-test-profile-flow]');
    const listEl = this.element.querySelector('ul');
    assert.ok(
      flowEl.compareDocumentPosition(listEl) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the Sankey is rendered ABOVE the post cards',
    );
  });

  test('an empty flow payload renders NO chart — just the cards (CC-105)', async function (assert) {
    // A non-rich profile (or one with no published posts) gets an empty flow
    // (nodes:[]) with HTTP 200, not an error. The chart is hidden entirely —
    // no empty frame, no "no data" box — mirroring the cards' null-safe drop.
    // (this.flowAttributes defaults to the empty flow set in beforeEach.)
    this.store.page1 = [
      { id: '1', title: 'Staff Engineer', link: 'https://example.com/jobs/1' },
    ];
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('[data-test-profile-flow]')
      .doesNotExist('no funnel section when the flow payload is empty');
    assert
      .dom('svg .sankey-nodes')
      .doesNotExist('no Sankey chart frame renders for an empty flow');
    assert
      .dom('li a')
      .hasText('Staff Engineer', 'the post cards still render without a chart');
  });

  test('the funnel fetch goes out ANONYMOUS — no Authorization header (CC-105)', async function (assert) {
    // The endpoint is AllowAny; a logged-out visitor must reach it. reportFetch
    // builds its headers from api.headers(), which emits {} with no session, so
    // the request carries no Authorization. This is the real public-safety
    // invariant — asserted at the fetch boundary, where the header actually
    // lives, not on a hand-normalized store record.
    this.flowAttributes = {
      nodes: [{ id: 'job_posts' }, { id: 'applications' }],
      links: [{ source: 0, target: 1, value: 3 }],
      total_job_posts: 3,
      total_applications: 3,
      scope: 'public_profile',
    };
    await invalidateSession();
    await visit('/dough');

    assert.ok(this.lastFlowRequest, 'the funnel endpoint was fetched');
    const headers = this.lastFlowRequest.opts.headers || {};
    assert.notOk(
      headers.Authorization,
      'no Authorization header — the AllowAny funnel read is sent anonymous',
    );
  });
});
