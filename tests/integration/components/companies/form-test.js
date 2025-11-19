import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | companies/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Companies::Form />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <Companies::Form>
        template block text
      </Companies::Form>
    `);

    assert.dom().hasText('template block text');
  });
});
