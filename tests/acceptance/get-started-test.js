import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, currentURL } from '@ember/test-helpers';
import { invalidateSession } from 'ember-simple-auth/test-support';

module('Acceptance | get-started landing', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    sessionStorage.setItem('cc:healthy', 'true');
    sessionStorage.setItem('cc:bootstrap-open', 'false');
  });

  hooks.afterEach(function () {
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
  });

  test('/get-started renders without authentication', async function (assert) {
    await invalidateSession();
    await visit('/get-started');

    assert.strictEqual(currentURL(), '/get-started', 'stayed on /get-started');
    assert
      .dom('a[href*="chromewebstore.google.com"]')
      .exists('install CTA links to the Chrome Web Store');
    assert
      .dom('a[href="/login"]')
      .exists('secondary path to sign-in is offered');
  });

  test('/extension redirects to /get-started', async function (assert) {
    await invalidateSession();
    await visit('/extension');

    assert.strictEqual(
      currentURL(),
      '/get-started',
      '/extension is an alias for /get-started',
    );
  });
});
