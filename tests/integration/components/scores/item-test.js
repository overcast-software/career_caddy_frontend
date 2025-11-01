import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | scores/item', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Scores::Item />`);

    assert.dom().includesText('score:');
    assert.dom().includesText('resume:');
    assert.dom().includesText('job-post:');

    // Template block usage:
    await render(hbs`
      <Scores::Item>
        template block text
      </Scores::Item>
    `);

    assert.dom().includesText('template block text');
  });
});
