import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, currentURL, settled } from '@ember/test-helpers';
import {
  authenticateSession,
  invalidateSession,
} from 'ember-simple-auth/test-support';
import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Minimal JWT-shaped tokens whose payloads decode to a known user_id.
const TOKEN_USER_1 = 'x.eyJ1c2VyX2lkIjoiMSJ9.x'; // user_id: "1"
const TOKEN_USER_2 = 'x.eyJ1c2VyX2lkIjoiMiJ9.x'; // user_id: "2"

const USER_1 = Object.freeze({ id: '1', username: 'admin', isGuest: false });
const USER_2 = Object.freeze({ id: '2', username: 'demouser', isGuest: true });

// A current-user stub that exercises the real session integration without
// needing the Ember Data store. The unit tests for the real CurrentUserService
// already cover the JWT-decode → store.findRecord path; here we care about
// the routing and UI reactivity.
const TOKEN_TO_USER = {
  [TOKEN_USER_1]: USER_1,
  [TOKEN_USER_2]: USER_2,
};

class CurrentUserStub extends Service {
  @service session;
  @tracked user = null;

  get isGuest() {
    return this.user?.isGuest ?? false;
  }

  async load() {
    this.user = null;
    if (!this.session.isAuthenticated) return;
    this.user = TOKEN_TO_USER[this.session.accessToken] ?? null;
  }
}

// Login lands on /job-posts, whose route hits infinity.model('job-post', …).
// Tests have no API; stub both store + infinity so the route resolves
// synchronously to an empty list instead of 404ing back to /login.
class StoreStub extends Service {
  peekAll() {
    return [];
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
  unloadAll() {}
}

class InfinityStub extends Service {
  model() {
    // <InfinityLoader> calls model.on('infinityModelLoaded', …);
    // a bare [] crashes with "infinityModel.on is not a function".
    const m = [];
    m.on = () => m;
    m.off = () => m;
    m.reachedInfinity = true;
    return m;
  }
}

module('Acceptance | login flow', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    // Bypass health check — tests do not have a real API server.
    sessionStorage.setItem('cc:healthy', 'true');
    sessionStorage.setItem('cc:bootstrap-open', 'false');

    // Replace the StubCurrentUser from helpers with our session-aware stub.
    this.owner.unregister('service:current-user');
    this.owner.register('service:current-user', CurrentUserStub);
    this.owner.unregister('service:store');
    this.owner.register('service:store', StoreStub);
    this.owner.unregister('service:infinity');
    this.owner.register('service:infinity', InfinityStub);
  });

  hooks.afterEach(function () {
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  test('login redirects to /job-posts after authenticating', async function (assert) {
    await visit('/login');
    assert.strictEqual(currentURL(), '/login', 'starts on login page');

    await authenticateSession({
      access: TOKEN_USER_1,
      refresh: 'x.x.x',
      exp: 9999999999,
    });

    assert.strictEqual(
      currentURL(),
      '/job-posts',
      'redirected to job-posts (dashboard) after login',
    );
  });

  // ── Username display ──────────────────────────────────────────────────────

  test('username appears in top bar after login', async function (assert) {
    await visit('/login');

    await authenticateSession({
      access: TOKEN_USER_1,
      refresh: 'x.x.x',
      exp: 9999999999,
    });

    assert
      .dom('.text-muted')
      .hasText('admin', 'admin username visible in top bar');
  });

  // ── Stale username: switches correctly when account changes ───────────────

  test('top bar shows new username after switching accounts', async function (assert) {
    await visit('/login');

    await authenticateSession({
      access: TOKEN_USER_1,
      refresh: 'x.x.x',
      exp: 9999999999,
    });
    assert.dom('.text-muted').hasText('admin', 'step 1: admin visible');

    // Invalidate and re-authenticate as a different user.
    await invalidateSession();
    await settled();

    await visit('/login');
    await authenticateSession({
      access: TOKEN_USER_2,
      refresh: 'x.x.x',
      exp: 9999999999,
    });

    assert
      .dom('.text-muted')
      .hasText('demouser', 'step 2: demouser visible after account switch');
  });

  test('username is cleared from top bar after logout', async function (assert) {
    await visit('/login');
    await authenticateSession({
      access: TOKEN_USER_1,
      refresh: 'x.x.x',
      exp: 9999999999,
    });
    assert
      .dom('.text-muted')
      .hasText('admin', 'username visible while logged in');

    await invalidateSession();
    await settled();

    assert.dom('.text-muted').doesNotExist('username gone after logout');
  });
});
