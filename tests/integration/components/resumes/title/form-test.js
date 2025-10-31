import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | resumes/title/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Resumes::Title::Form />`);

    assert.dom().includesText('Title');
    assert.dom().includesText('Name');
    assert.dom().includesText('Notes');

    // Template block usage:
    await render(hbs`
      <Resumes::Title::Form>
        template block text
      </Resumes::Title::Form>
    `);

    assert.dom().includesText('template block text');
  });
});
