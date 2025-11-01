import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | top-bar', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<TopBar />`);

    assert.dom().includesText('Career Caddy');
    assert.dom().includesText('Job posts');
    assert.dom().includesText('About');
    assert.dom().includesText('Docs');
    assert.dom().includesText('GitHub');
    assert.dom().includesText('Login');
  });
});
