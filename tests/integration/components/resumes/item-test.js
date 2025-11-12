import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | resumes/item', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Resumes::Item />`);

    assert.dom().includesText('Summary');
    // assert.dom().includesText('Skills'); //only shows skills if present
    assert.dom().includesText('Experience');
    assert.dom().includesText('Education');
    assert.dom().includesText('Certifications');

    // Template block usage:
    await render(hbs`
      <Resumes::Item>
        template block text
      </Resumes::Item>
    `);

    assert.dom().includesText('template block text');
  });
});
