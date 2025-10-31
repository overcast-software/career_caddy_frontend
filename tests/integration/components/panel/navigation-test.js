import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | panel/navigation', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Panel::Navigation />`);

    assert.dom().includesText('←');
    assert.dom().includesText('→');
    assert.dom().includesText('Down');
    assert.dom().includesText('Up');

    // Template block usage:
    await render(hbs`
      <Panel::Navigation>
        template block text
      </Panel::Navigation>
    `);

    assert.dom().includesText('template block text');
  });
});
