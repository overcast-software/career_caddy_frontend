import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, currentURL, settled } from '@ember/test-helpers';
import { invalidateSession } from 'ember-simple-auth/test-support';

const RESOURCE_ROUTES = [
  { path: '/scores', docsPath: '/docs/scores' },
  { path: '/summaries', docsPath: '/docs/summaries' },
  { path: '/questions', docsPath: '/docs/questions' },
  { path: '/answers', docsPath: '/docs/answers' },
  { path: '/career-data', docsPath: '/docs/career-data' },
  { path: '/job-posts', docsPath: '/docs/job-posts' },
  { path: '/job-applications', docsPath: '/docs/job-applications' },
  { path: '/companies', docsPath: '/docs/companies' },
  { path: '/resumes', docsPath: '/docs/resumes' },
  { path: '/cover-letters', docsPath: '/docs/cover-letters' },
  { path: '/scrapes', docsPath: '/docs/scrapes' },
];

async function visitExpectingRedirect(path) {
  try {
    await visit(path);
  } catch (e) {
    if (!e.message?.includes('TransitionAborted')) {
      throw e;
    }
  }
  await settled();
}

module('Acceptance | unauthenticated redirect', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    sessionStorage.setItem('cc:healthy', 'true');
    sessionStorage.setItem('cc:bootstrap-open', 'false');
  });

  hooks.afterEach(function () {
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
  });

  for (const { path, docsPath } of RESOURCE_ROUTES) {
    test(`visiting ${path} unauthenticated redirects to ${docsPath}`, async function (assert) {
      await invalidateSession();
      await visitExpectingRedirect(path);

      assert.strictEqual(
        currentURL(),
        docsPath,
        `${path} redirected to ${docsPath}`,
      );
    });
  }

  test('visiting /settings unauthenticated redirects to /login', async function (assert) {
    await invalidateSession();
    await visitExpectingRedirect('/settings');

    assert.strictEqual(
      currentURL(),
      '/login',
      'non-resource route goes to login',
    );
  });
});
