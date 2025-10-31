import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | job-applications/edit', function (hooks) {
  setupRenderingTest(hooks);

  // test('it renders', async function (assert) {
  //   class StubCurrentUser extends Service {
  //     user = {
  //       resumes: [{ id: 'r2', name: 'Other Resume' }],
  //       coverLetters: [],
  //     };
  //   }

  //   this.owner.register('service:current-user', StubCurrentUser);

    this.set('jobApplication', {
      resume: { id: 'r1', name: 'Primary Resume' },
      coverLetter: { id: 'cl1', createdAt: new Date() },
      status: '',
      trackingUrl: '',
      notes: '',
      belongsTo() {
        return { value() {} };
      },
    });

    this.set('selectedSatus', this.jobApplication.status)
    render(
      hbs`<JobApplications::Edit @jobApplication={{this.jobApplication}}/>`,
    );

    assert.dom().hasText('Job Post Resume Primary Resume Other Resume Cover Letter cl1 - 2025-10-30 Applied At Status Applied Interviewing Rejected Offer Withdrawn Tracking URL Notes Save');
});
