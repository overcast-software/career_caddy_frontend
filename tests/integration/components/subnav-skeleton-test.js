import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | subnav-skeleton', function (hooks) {
  setupRenderingTest(hooks);

  test('renders a placeholder row inside .controls', async function (assert) {
    await render(hbs`<SubnavSkeleton />`);
    assert
      .dom('.controls')
      .exists(
        'wraps placeholders in the same .controls row the live subnav uses',
      );
    assert
      .dom('.controls > div.animate-pulse')
      .exists(
        { count: 2 },
        'renders two pulse blocks to mirror search + action',
      );
  });

  test('is decorative (aria-hidden) so screen readers skip it', async function (assert) {
    await render(hbs`<SubnavSkeleton />`);
    assert.dom('.controls').hasAttribute('aria-hidden', 'true');
  });
});
