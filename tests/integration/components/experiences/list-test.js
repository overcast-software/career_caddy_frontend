import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | experiences/list', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders empty state', async function (assert) {
    await render(hbs`<Experiences::List />`);
    assert.dom().hasText('No experiences yet. Use "+ Add" to create one.');
  });
});
