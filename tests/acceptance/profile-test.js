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
});
