import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | main-application', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    localStorage.removeItem('cc:sidebar-open');
    localStorage.removeItem('cc:chat-open');
  });

  test('it renders', async function (assert) {
    await render(hbs`<MainApplication />`);
    assert.ok(this.element, 'component renders');

    await render(hbs`
      <MainApplication>
        template block text
      </MainApplication>
    `);
    assert.ok(this.element, 'component renders in block mode');
  });

  // ── Sidebar open/close ────────────────────────────────────────────────────

  test('sidebar is closed by default', async function (assert) {
    await render(hbs`<MainApplication />`);
    assert
      .dom('.course')
      .doesNotHaveClass(
        'course--sidebar-open',
        'sidebar starts closed when nothing stored',
      );
  });

  test('sidebar opens when localStorage says so', async function (assert) {
    localStorage.setItem('cc:sidebar-open', 'true');
    await render(hbs`<MainApplication />`);
    assert
      .dom('.course')
      .hasClass(
        'course--sidebar-open',
        'sidebar opens when explicitly stored as true',
      );
  });

  test('toggle button opens then closes the sidebar', async function (assert) {
    await render(hbs`<MainApplication />`);
    assert
      .dom('.course')
      .doesNotHaveClass('course--sidebar-open', 'starts closed');

    await click('.topbar-hamburger');
    assert
      .dom('.course')
      .hasClass('course--sidebar-open', 'sidebar opens on first toggle');

    await click('.topbar-hamburger');
    assert
      .dom('.course')
      .doesNotHaveClass(
        'course--sidebar-open',
        'sidebar closes on second toggle',
      );
  });

  test('desktop sidebar closes when close is called', async function (assert) {
    // Sidebar is now a slide-in drawer at every viewport size — close()
    // closes it regardless of innerWidth. Use the drawer's back-btn
    // (course-sidebar is display:none and not interactive).
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
    });
    localStorage.setItem('cc:sidebar-open', 'true');

    await render(hbs`<MainApplication />`);
    assert.dom('.course').hasClass('course--sidebar-open', 'starts open');

    await click('.mobile-drawer .sidebar-back-btn');
    assert
      .dom('.course')
      .doesNotHaveClass(
        'course--sidebar-open',
        'sidebar closes via back-arrow on desktop',
      );

    // Restore for other tests
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
  });

  test('mobile overlay click closes the sidebar', async function (assert) {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    localStorage.setItem('cc:sidebar-open', 'true');

    await render(hbs`<MainApplication />`);
    assert.dom('.mobile-overlay').exists('overlay present when open');

    await click('.mobile-overlay');
    assert
      .dom('.course')
      .doesNotHaveClass(
        'course--sidebar-open',
        'sidebar closes on mobile when overlay is clicked',
      );
  });
});
