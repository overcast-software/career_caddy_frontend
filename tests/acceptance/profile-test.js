import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, currentURL } from '@ember/test-helpers';
import { invalidateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';

// CC #51 — public /<username> profile page. The route loads its data via
// store.query('public-job-post', { username }) against the public no-auth
// endpoint GET /api/v1/users/:username/job-posts/federated/ (api PR #195).
// Per the project's acceptance convention (see resolve-and-dedupe-test.js /
// mark-incomplete-test.js) we mock at the store boundary with a StoreStub
// rather than at the network, so the populated POJOs mirror the contract's
// attribute shape (title/company_name/location/posted_date/link).
//
// `query` is controllable per test:
//   - queryResult       → resolved array of post POJOs (the template reads
//                         plain props, same surface as real records here)
//   - queryShouldReject → simulate the 404 while the api slice is unbuilt, so
//                         the route's .catch degrades to the empty state.
class StoreStub extends Service {
  queryResult = [];
  queryShouldReject = false;

  query(modelName) {
    if (modelName === 'public-job-post') {
      if (this.queryShouldReject) {
        return Promise.reject(new Error('not found'));
      }
      return Promise.resolve(this.queryResult);
    }
    return Promise.resolve([]);
  }

  // Defensive no-ops mirroring the other acceptance StoreStubs — the public
  // route's beforeModel returns early on the allowlist, so nothing else here
  // is exercised, but keep the surface consistent.
  async findRecord() {
    return null;
  }
  peekRecord() {
    return null;
  }
  async queryRecord() {
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

  test('a logged-out visitor can load /dough without an auth redirect', async function (assert) {
    this.store.queryResult = [];
    await invalidateSession();
    await visit('/dough');

    assert.strictEqual(
      currentURL(),
      '/dough',
      'stayed on /dough — route is public, no redirect to /login',
    );
    assert.dom('h1').hasText('dough', 'profile header shows the username');
    assert
      .dom('.course-sidebar')
      .doesNotExist(
        'public profile renders chromeless — no authenticated app sidebar',
      );
  });

  test('a missing/erroring endpoint degrades to the empty state', async function (assert) {
    this.store.queryShouldReject = true;
    await invalidateSession();
    await visit('/dough');

    assert
      .dom('h2')
      .hasText(
        'No published posts yet',
        'empty state renders when the query rejects (e.g. 404 before the api lands)',
      );
  });

  test('published posts render with title, company, location, date, and link', async function (assert) {
    this.store.queryResult = [
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
});
