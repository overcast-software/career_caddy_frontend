import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | job-posts/controls', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<JobPosts::Controls />`);

    assert.dom().includesText('Search:');
    assert.dom().includesText('Compact view');
    assert.dom().includesText('Create new');

    // Template block usage:
    await render(hbs`
      <JobPosts::Controls>
        template block text
      </JobPosts::Controls>
    `);

    assert.dom().includesText('template block text');
  });
});
