import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | resumes/item', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders without a resume', async function (assert) {
    await render(hbs`<Resumes::Item />`);
    assert.dom().exists();
  });
});
