import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | job-applications/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    this.set("errorMessage", null);
    this.set('noop', () => {});
    this.set('jobApplication', {
      resume: null,
      coverLetter: null,
      status: '',
      trackingUrl: '',
      notes: '',
    });

    await render(hbs`<JobApplications::Form 
      @jobApplication={{this.jobApplication}}
      @onSave={{this.noop}}
      @onCancel={{this.noop}}
      @onResumeChange={{this.noop}}
      @onCoverLetterChange={{this.noop}}
      @onStatusChange={{this.noop}}
      @onAppliedAtChange={{this.noop}}
      @onTrackingUrlChange={{this.noop}}
      @onNotesChange={{this.noop}}
    />`);

    assert.dom().includesText('User');
    assert.dom().includesText('Job Post');
    assert.dom().includesText('Resume');
    assert.dom().includesText('Select a resume');
    assert.dom().includesText('Cover Letter');
    assert.dom().includesText('Select a cover letter');
    assert.dom().includesText('Applied At');
    assert.dom().includesText('Status');
    assert.dom().includesText('Select status');
    assert.dom().includesText('Tracking URL');
    assert.dom().includesText('Notes');
    assert.dom().includesText('Save');

    // Template block usage:
    // await render(hbs`
    //   <JobApplications::Form>
    //     template block text
    //   </JobApplications::Form>
    // `);

    // assert.dom().hasText('template block text');
  });
});
