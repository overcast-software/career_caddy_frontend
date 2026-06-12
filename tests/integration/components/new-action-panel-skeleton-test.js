import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | new-action-panel-skeleton', function (hooks) {
  setupRenderingTest(hooks);

  test('renders a panel-card with select + button placeholders', async function (assert) {
    await render(hbs`<NewActionPanelSkeleton />`);
    assert
      .dom('section.panel-card')
      .exists(
        'uses the panel-card wrapper for shape parity with the live form',
      );
    assert
      .dom('section.panel-card .panel-body .flex > div')
      .exists(
        { count: 2 },
        'two pulse blocks mirror the select + submit button row',
      );
  });

  test('omits the instructions textarea unless @withInstructions is true', async function (assert) {
    await render(hbs`<NewActionPanelSkeleton />`);
    assert
      .dom('section.panel-card .panel-body > div.mt-2')
      .doesNotExist('applications tab variant has no AI-instructions textarea');

    await render(hbs`<NewActionPanelSkeleton @withInstructions={{true}} />`);
    assert
      .dom('section.panel-card .panel-body > div.mt-2')
      .exists(
        'scores/summaries/cover-letters variants include the textarea-shaped row',
      );
  });
});
