import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | personal-information/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<PersonalInformation::Form />`);

    assert.dom().includesText('Name');
    assert.dom().includesText('Phone');
    assert.dom().includesText('Email');

    // Template block usage:
    await render(hbs`
      <PersonalInformation::Form>
        template block text
      </PersonalInformation::Form>
    `);

    assert.dom().includesText('template block text');
  });
});
