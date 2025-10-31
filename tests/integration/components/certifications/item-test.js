import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | certifications/item', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Certifications::Item />`);

    assert.dom().hasText('--');

    // Template block usage:
    await render(hbs`
      <Certifications::Item>
        template block text
      </Certifications::Item>
    `);

    assert.dom().hasText('template block text --');
  });
});
