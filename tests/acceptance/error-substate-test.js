import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit } from '@ember/test-helpers';
import { authenticateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { NotFoundError, ServerError } from '@ember-data/adapter/error';

// CC-121 layer 1 — the application-level `error` substate, the universal
// safety net.
//
// Deliberately targeted at companies/show, a route with NO error handling of
// its own. Before this change its model() rejection had nowhere to land and
// Glimmer blanked the app. Ember resolves the application route's error
// substate to the plain `error` name, so app/templates/error.hbs renders into
// application.hbs's {{outlet}} — INSIDE <MainApplication>, which is why the
// sidebar assertion below is the real "not a white screen" proof.
//
// The 5xx variant is not padding: it locks in that ErrorController#is404
// DISCRIMINATES. A helper that returned true for everything would pass the
// 404 test alone and quietly tell users their server outage was a typo.
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
  // Set by each test to the error findRecord('company') should throw.
  companyError = null;

  async findRecord(type) {
    if (type === 'company' && this.companyError) {
      throw this.companyError;
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

module('Acceptance | app-level error substate (CC-121)', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    sessionStorage.setItem('cc:healthy', 'true');
    sessionStorage.setItem('cc:bootstrap-open', 'false');

    this.owner.unregister('service:current-user');
    this.owner.register('service:current-user', CurrentUserStub);

    this.owner.unregister('service:store');
    this.owner.register('service:store', StoreStub);
    this.store = this.owner.lookup('service:store');
  });

  hooks.afterEach(function () {
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
  });

  test('a 404 on an UNHANDLED route renders the 404 substate with chrome intact', async function (assert) {
    this.store.companyError = new NotFoundError(
      [{ status: '404' }],
      'Not Found',
    );
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });

    await visit('/companies/999');

    assert
      .dom('[data-test-error-404]')
      .exists(
        'companies/show has no error handling of its own — the app-level net caught it',
      );
    assert
      .dom('.course-sidebar')
      .exists(
        'the substate renders inside <MainApplication> — not a blank page',
      );
    assert
      .dom('[data-test-error-5xx]')
      .doesNotExist('a 404 does not render the generic failure card');
  });

  test('a 5xx renders the generic failure substate, NOT the 404 one', async function (assert) {
    this.store.companyError = new ServerError(
      [{ status: '500' }],
      'Server Error',
    );
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });

    await visit('/companies/999');

    assert
      .dom('[data-test-error-5xx]')
      .exists('a server error falls to the "something went wrong" branch');
    assert
      .dom('[data-test-error-404]')
      .doesNotExist(
        'isNotFound discriminates — a 500 is never reported as "we could not find that"',
      );
    assert
      .dom('.course-sidebar')
      .exists('the 5xx substate also keeps the app chrome');
  });
});
