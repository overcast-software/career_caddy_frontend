import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | experiences/item', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Experiences::Item />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <Experiences::Item>
        template block text
      </Experiences::Item>
    `);

    assert.dom().hasText('template block text');
  });
});
