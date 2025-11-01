import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | experiences/editor/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Experiences::Editor::Form />`);

    assert
      .dom()
      .hasText(
        'v Company Title Location Start Date End Date Present I currently work here Description Descriptions Add description Save Cancel Delete',
      );

    // Template block usage:
    // await render(hbs`
    //   <Experiences::Editor::Form>
    //     template block text
    //   </Experiences::Editor::Form>
    // `);

    // assert.dom().hasText('template block text');
  });
});
