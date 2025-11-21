import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | answers/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Answers::Form />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <Answers::Form>
        template block text
      </Answers::Form>
    `);

    assert.dom().hasText('template block text');
  });
});
