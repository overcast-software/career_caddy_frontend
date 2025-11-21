import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | questions/item', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Questions::Item />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <Questions::Item>
        template block text
      </Questions::Item>
    `);

    assert.dom().hasText('template block text');
  });
});
