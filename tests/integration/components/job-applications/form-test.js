import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | job-applications/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    this.set("errorMessage", null)
    await render(hbs`<JobApplications::Form />`);

    assert.dom().hasText('User Job Post Resume Select a resume... Cover Letter Select a cover letter... Applied At Status Select status... Tracking URL Notes Save');

    // Template block usage:
    await render(hbs`
      <JobApplications::Form>
        template block text
      </JobApplications::Form>
    `);

    assert.dom().hasText('template block text');
  });
});
