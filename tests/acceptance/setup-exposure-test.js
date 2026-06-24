import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, currentURL, settled } from '@ember/test-helpers';
import { authenticateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

// A redirect issued from a route's beforeModel (replaceWith) aborts the
// in-flight transition, which visit() surfaces as a TransitionAborted
// rejection. Swallow it and settle, mirroring unauthenticated-redirect-test.
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

// Deterministic stand-in for the health service so the route gate is
// exercised without a real /api/v1/healthcheck/ round-trip. `ok` mirrors
// ensureHealthy()'s resolved value; `bootstrapOpen` is the only signal the
// route is now allowed to act on for the /setup redirect.
class HealthStub extends Service {
  @tracked bootstrapOpen = false;
  @tracked registrationOpen = false;
  ok = true;
  async ensureHealthy() {
    return this.ok;
  }
  setHealthy() {}
  setBootstrapOpen(value) {
    this.bootstrapOpen = value;
  }
}

class CurrentUserStub extends Service {
  @tracked user = {
    id: '1',
    firstName: 'Jane',
    lastName: 'Doe',
    isStaff: false,
    isGuest: false,
  };
  @tracked onboarding = null;
  isGuest = false;
  load() {
    return Promise.resolve(this.user);
  }
  async loadOnboarding() {
    return this.onboarding;
  }
}

class StoreStub extends Service {
  peekAll() {
    return [];
  }
  async queryRecord() {
    return null;
  }
  async query() {
    return [];
  }
  async findAll() {
    return [];
  }
  unloadAll() {}
}

module('Acceptance | setup exposure', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    this.owner.unregister('service:health');
    this.owner.register('service:health', HealthStub);
    this.owner.unregister('service:current-user');
    this.owner.register('service:current-user', CurrentUserStub);
    this.owner.unregister('service:store');
    this.owner.register('service:store', StoreStub);
  });

  test('an affirmative bootstrap_open routes a fresh load to /setup', async function (assert) {
    const health = this.owner.lookup('service:health');
    health.ok = true;
    health.bootstrapOpen = true;

    await visitExpectingRedirect('/');

    assert.strictEqual(
      currentURL(),
      '/setup',
      'wizard is shown when the API affirmatively reports bootstrap is open',
    );
  });

  test('a failed healthcheck on an initialized system never routes to /setup', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
    const health = this.owner.lookup('service:health');
    // Healthcheck failed (ok=false) but the API never affirmed bootstrap is
    // open. This is the regression: it used to land on /setup via the !ok
    // clause in application.js. It must now fall through to the normal flow.
    health.ok = false;
    health.bootstrapOpen = false;

    await visit('/');

    assert.notStrictEqual(
      currentURL(),
      '/setup',
      'a transient healthcheck failure must not expose the wizard',
    );
    assert.strictEqual(currentURL(), '/', 'falls through to the normal flow');
  });
});
