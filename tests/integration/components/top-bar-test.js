import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | top-bar', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    this.set('onToggle', () => {});
    await render(hbs`<TopBar @onToggle={{this.onToggle}} />`);

    assert.dom().includesText('CareerCaddy');
    assert.dom().includesText('Login');
  });
});
