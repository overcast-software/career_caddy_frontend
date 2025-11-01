import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | job-posts/actions', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<JobPosts::Actions />`);

    assert.dom().includesText('Select a resume');

    // Template block usage:
    await render(hbs`
      <JobPosts::Actions>
        template block text
      </JobPosts::Actions>
    `);

    assert.dom().includesText('template block text');
  });
});
