import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | cover-letters/list', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<CoverLetters::List />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <CoverLetters::List>
        template block text
      </CoverLetters::List>
    `);

    assert.dom().hasText('template block text');
  });
});
