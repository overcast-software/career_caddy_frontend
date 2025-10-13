import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | descriptions/editor/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Descriptions::Editor::Form />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <Descriptions::Editor::Form>
        template block text
      </Descriptions::Editor::Form>
    `);

    assert.dom().hasText('template block text');
  });
});
