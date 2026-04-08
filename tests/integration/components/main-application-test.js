import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | main-application', function (hooks) {
  setupRenderingTest(hooks);

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

  test('clicking a desktop sidebar nav link closes the sidebar', async function (assert) {
    await render(hbs`<MainApplication />`);
    assert.dom('.course').hasClass('course--sidebar-open', 'starts open');

    // The back-arrow / close button is inside .course-sidebar (the desktop sidebar).
    await click('.course-sidebar .sidebar-back-btn');
    assert
      .dom('.course')
      .doesNotHaveClass(
        'course--sidebar-open',
        'sidebar closes when a desktop nav link calls onClose',
      );
  });

  test('clicking the mobile overlay closes the sidebar', async function (assert) {
    await render(hbs`<MainApplication />`);
    assert.dom('.mobile-overlay').exists('overlay present when open');

    await click('.mobile-overlay');
    assert
      .dom('.course')
      .doesNotHaveClass(
        'course--sidebar-open',
        'sidebar closes when overlay is clicked',
      );
  });
});
