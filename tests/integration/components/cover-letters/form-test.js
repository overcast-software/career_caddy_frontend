import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | cover-letters/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<CoverLetters::Form />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <CoverLetters::Form>
        template block text
      </CoverLetters::Form>
    `);

    assert.dom().hasText('template block text');
  });
});
