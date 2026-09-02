import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, currentURL } from '@ember/test-helpers';
import { authenticateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { NotFoundError } from '@ember-data/adapter/error';

// CC-121 layer 2 — /job-posts/<bad-id> degrades INLINE instead of redirecting.
//
// The reported bug: pasting a scrape id into a job-post URL 404s the api and
// white-screened the whole SPA. The route now catches a typed NotFoundError in
// model() and RESOLVES with a { isNotFound, requestedId } sentinel, so:
//   • the URL the user typed is preserved (the removed error() action used to
//     transitionTo('job-posts.index') and throw the id away), and
//   • the app chrome renders, which is what proves this is not a white screen.
//
// StoreStub pattern per the project acceptance convention (profile-test.js /
// mark-incomplete-test.js) — we mock at the STORE boundary, and reject with a
// REAL typed error so isNotFound() is exercised for what it actually receives
// rather than a hand-rolled shape that happens to satisfy it.
class CurrentUserStub extends Service {
  @tracked user = {
    id: '1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    isStaff: false,
    isGuest: false,
  };
  @tracked onboarding = null;
  @tracked extensionPresent = false;
  isGuest = false;
  load() {
    return this.user;
  }
  async loadOnboarding() {
    return null;
  }
}

class StoreStub extends Service {
  async findRecord(type) {
    if (type === 'job-post') {
      throw new NotFoundError([{ status: '404' }], 'Not Found');
    }
    return null;
  }
  peekRecord() {
    return null;
  }
  async query() {
    return [];
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

module('Acceptance | job post not found (CC-121)', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    sessionStorage.setItem('cc:healthy', 'true');
    sessionStorage.setItem('cc:bootstrap-open', 'false');

    this.owner.unregister('service:current-user');
    this.owner.register('service:current-user', CurrentUserStub);

    this.owner.unregister('service:store');
    this.owner.register('service:store', StoreStub);
  });

  hooks.afterEach(function () {
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
  });

  test('a 404 renders the inline not-found card and STAYS on the url', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });

    await visit('/job-posts/999');

    assert.strictEqual(
      currentURL(),
      '/job-posts/999',
      'no redirect to job-posts.index — the typed id survives the 404',
    );
    assert
      .dom('[data-test-jp-not-found]')
      .exists('the inline not-found card renders in place of the post body');
    assert
      .dom('[data-test-jp-not-found]')
      .includesText(
        'scrape id',
        'the card carries the contextual scrape-id hint that filed this ticket',
      );
    assert
      .dom('[data-test-jp-not-found]')
      .includesText(
        '999',
        'the card echoes the id that was actually requested',
      );
    assert
      .dom('.course-sidebar')
      .exists(
        'the app chrome still renders — this is the white-screen regression guard',
      );
    assert
      .dom('[data-test-error-404]')
      .doesNotExist(
        'the inline degradation resolves model(), so the app-level substate never fires',
      );
  });
});
