import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table-skeleton', function (hooks) {
  setupRenderingTest(hooks);

  test('renders an animate-pulse status container', async function (assert) {
    await render(hbs`<TableSkeleton />`);
    assert
      .dom('[role="status"].animate-pulse')
      .exists('renders a single pulsing region announced as status');
    assert
      .dom('[role="status"]')
      .hasAttribute(
        'aria-label',
        'Loading…',
        'aria-label is the loading affordance assistive tech reads',
      );
  });

  test('renders five placeholder rows by default', async function (assert) {
    await render(hbs`<TableSkeleton />`);
    // Each body row is a grid container; the header is its own grid block.
    assert
      .dom('[role="status"] .divide-y > .grid')
      .exists(
        { count: 5 },
        'five rows of pulse bars matches the perceived weight of a short list',
      );
  });

  test('renders action-shaped placeholders when @hasActionsCol is true', async function (assert) {
    await render(hbs`<TableSkeleton @hasActionsCol={{true}} />`);
    assert
      .dom('[role="status"] .divide-y > .grid .justify-end')
      .exists(
        { count: 5 },
        'each row ends in a right-aligned cluster mirroring the live actions column',
      );
  });
});
