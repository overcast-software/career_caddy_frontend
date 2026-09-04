import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

// The real <meta name="theme-color" id="theme-color-meta"> lives in
// app/index.html, which is NOT the test-runner page — so we inject a stand-in
// into document.head and clean it up afterwards. The theme service reads the
// live `--card` custom property off <html> after stamping data-theme /
// data-palette, so the meta tracks whatever the cascade now resolves. `--card`
// is mode-scoped (light #fff / dark #1e293b, identical across all 6 palettes),
// so setMode flips it while setPalette re-syncs it to the current value.
module('Unit | Service | theme', function (hooks) {
  setupTest(hooks);

  let meta;

  hooks.beforeEach(function () {
    meta = document.getElementById('theme-color-meta');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('id', 'theme-color-meta');
      meta.setAttribute('content', '#ffffff');
      document.head.appendChild(meta);
    }
  });

  hooks.afterEach(function () {
    meta.remove();
    // The service persists its choices; reset so cases don't bleed.
    localStorage.removeItem('theme-mode');
    localStorage.removeItem('theme-palette');
    // Undo the dataset stamps left on the shared <html> element.
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.palette;
  });

  test('setMode updates #theme-color-meta and light vs dark differ', function (assert) {
    const theme = this.owner.lookup('service:theme');

    theme.setMode('light');
    const light = meta.getAttribute('content');
    assert.ok(light, 'light mode writes a non-empty theme-color');

    theme.setMode('dark');
    const dark = meta.getAttribute('content');
    assert.ok(dark, 'dark mode writes a non-empty theme-color');

    assert.notStrictEqual(
      dark,
      light,
      'status-bar colour changes between light and dark',
    );
  });

  test('setPalette keeps #theme-color-meta synced to the live --card', function (assert) {
    const theme = this.owner.lookup('service:theme');
    theme.setMode('light');

    theme.setPalette('jade');
    const expected = getComputedStyle(document.documentElement)
      .getPropertyValue('--card')
      .trim();

    assert.ok(expected, '--card resolves in the test document');
    assert.strictEqual(
      meta.getAttribute('content'),
      expected,
      'meta content re-syncs to --card on setPalette',
    );
  });

  test('_apply is a no-op on the meta when it is absent (test/SSR safety)', function (assert) {
    meta.remove();
    const theme = this.owner.lookup('service:theme');

    // Should not throw even though #theme-color-meta is gone.
    theme.setMode('dark');
    theme.setPalette('rose');

    assert.true(true, 'no throw when the meta element is missing');
    // Re-add so afterEach's remove() has a node to operate on.
    meta = document.createElement('meta');
    meta.setAttribute('id', 'theme-color-meta');
    document.head.appendChild(meta);
  });
});
