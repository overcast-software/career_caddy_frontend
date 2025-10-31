import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | certifications/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    this.certification = {};
    await render(
      hbs`<Certifications::Form @certification={{this.certification}}/>`,
    );

    assert.dom().hasText('Issuer Title Content Issue Date');

    // Template block usage:
    // There is no yield
    // await render(hbs`
    //   <Certifications::Form>
    //     template block text
    //   </Certifications::Form>
    // `);

    // assert.dom().hasText('Issuer Title Content Issue Date');
  });
});
