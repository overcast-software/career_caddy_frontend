import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

class SessionStub extends Service {
  @tracked isAuthenticated = false;
  async invalidate() {
    this.isAuthenticated = false;
  }
}

class CurrentUserStub extends Service {
  @tracked user = null;
  get isGuest() {
    return this.user?.isGuest ?? false;
  }
}

module('Integration | Component | top-bar', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:session', SessionStub);
    this.owner.register('service:current-user', CurrentUserStub);
    this.set('onToggle', () => {});
    this.set('onClose', () => {});
  });

  // ── Unauthenticated state ─────────────────────────────────────────────────

  test('shows Login link when not authenticated', async function (assert) {
    await render(
      hbs`<TopBar @onToggle={{this.onToggle}} @onClose={{this.onClose}} />`,
    );

    assert.dom().includesText('Login');
    assert.dom('.text-muted').doesNotExist();
  });

  test('does not show username when authenticated but user is null', async function (assert) {
    this.owner.lookup('service:session').isAuthenticated = true;

    await render(
      hbs`<TopBar @onToggle={{this.onToggle}} @onClose={{this.onClose}} />`,
    );

    assert
      .dom('.text-muted')
      .doesNotExist('no username span when user is null');
  });

  // ── Authenticated state ───────────────────────────────────────────────────

  test('shows username when authenticated with a loaded user', async function (assert) {
    this.owner.lookup('service:session').isAuthenticated = true;
    this.owner.lookup('service:current-user').user = {
      username: 'admin',
      isGuest: false,
    };

    await render(
      hbs`<TopBar @onToggle={{this.onToggle}} @onClose={{this.onClose}} />`,
    );

    assert.dom('.text-muted').hasText('admin');
  });

  test('shows logout button and hides login link when authenticated', async function (assert) {
    this.owner.lookup('service:session').isAuthenticated = true;
    this.owner.lookup('service:current-user').user = {
      username: 'admin',
      isGuest: false,
    };

    await render(
      hbs`<TopBar @onToggle={{this.onToggle}} @onClose={{this.onClose}} />`,
    );

    assert.dom('button[title="Logout"]').exists();
    assert.dom().doesNotIncludeText('Login');
  });

  // ── Stale username: reactivity when user changes ──────────────────────────

  test('updates username when current user switches accounts', async function (assert) {
    const session = this.owner.lookup('service:session');
    const currentUser = this.owner.lookup('service:current-user');

    session.isAuthenticated = true;
    currentUser.user = { username: 'admin', isGuest: false };

    await render(
      hbs`<TopBar @onToggle={{this.onToggle}} @onClose={{this.onClose}} />`,
    );
    assert.dom('.text-muted').hasText('admin', 'shows first user');

    // Simulate load() cycling: null → new user
    currentUser.user = null;
    await settled();
    assert.dom('.text-muted').doesNotExist('username clears while switching');

    currentUser.user = { username: 'demouser', isGuest: true };
    await settled();
    assert
      .dom('.text-muted')
      .hasText('demouser', 'shows new user after switch');
  });

  test('clears username when session is invalidated', async function (assert) {
    const session = this.owner.lookup('service:session');
    const currentUser = this.owner.lookup('service:current-user');

    session.isAuthenticated = true;
    currentUser.user = { username: 'admin', isGuest: false };

    await render(
      hbs`<TopBar @onToggle={{this.onToggle}} @onClose={{this.onClose}} />`,
    );
    assert.dom('.text-muted').hasText('admin');

    session.isAuthenticated = false;
    currentUser.user = null;
    await settled();

    assert.dom('.text-muted').doesNotExist('username gone after logout');
    assert.dom().includesText('Login');
  });

  test('cycles correctly: admin → guest → admin', async function (assert) {
    const session = this.owner.lookup('service:session');
    const currentUser = this.owner.lookup('service:current-user');

    session.isAuthenticated = true;
    currentUser.user = { username: 'admin', isGuest: false };

    await render(
      hbs`<TopBar @onToggle={{this.onToggle}} @onClose={{this.onClose}} />`,
    );
    assert.dom('.text-muted').hasText('admin', 'step 1: admin');

    currentUser.user = null;
    await settled();
    currentUser.user = { username: 'demouser', isGuest: true };
    await settled();
    assert.dom('.text-muted').hasText('demouser', 'step 2: guest');

    currentUser.user = null;
    await settled();
    currentUser.user = { username: 'admin', isGuest: false };
    await settled();
    assert.dom('.text-muted').hasText('admin', 'step 3: back to admin');
  });
});
