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

  test('sidebar is open by default', async function (assert) {
    await render(hbs`<MainApplication />`);
    assert
      .dom('.course')
      .hasClass('course--sidebar-open', 'sidebar open on load');
  });

  test('toggle button closes the sidebar', async function (assert) {
    await render(hbs`<MainApplication />`);
    assert.dom('.course').hasClass('course--sidebar-open', 'starts open');

    await click('.topbar-hamburger');
    assert
      .dom('.course')
      .doesNotHaveClass('course--sidebar-open', 'sidebar closes after toggle');
  });

  test('desktop sidebar stays open when close is called', async function (assert) {
    // On wide viewports (≥768px), close() is a no-op — sidebar stays open.
    // Test environment viewport is narrow, so we verify close() checks width.
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
    });

    await render(hbs`<MainApplication />`);
    assert.dom('.course').hasClass('course--sidebar-open', 'starts open');

    await click('.course-sidebar .sidebar-back-btn');
    assert
      .dom('.course')
      .hasClass(
        'course--sidebar-open',
        'sidebar stays open on desktop when close is called',
      );

    // Restore for other tests
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
  });

  test('mobile overlay click closes the sidebar', async function (assert) {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

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
