import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | job-applications/edit', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    class StubCurrentUser extends Service {
      user = {
        resumes: [{ id: 'r2', name: 'Other Resume' }],
        coverLetters: [],
      };
    }

    this.owner.register('service:current-user', StubCurrentUser);

    this.set('jobApplication', {
      resume: { id: 'r1', name: 'Primary Resume' },
      coverLetter: { id: 'cl1', createdAt: new Date('2025-10-30') },
      status: '',
      trackingUrl: '',
      notes: '',
      belongsTo() {
        return { value() {} };
      },
    });

    await render(
      hbs`<JobApplications::Edit @jobApplication={{this.jobApplication}}/>`,
    );

    assert.dom().includesText('Job Post');
    assert.dom().includesText('Resume');
    assert.dom().includesText('Primary Resume');
    assert.dom().includesText('Other Resume');
    assert.dom().includesText('Cover Letter');
    assert.dom().includesText('cl1 - 2025-10-30');
    assert.dom().includesText('Applied At');
    assert.dom().includesText('Status');
    assert.dom().includesText('Applied');
    assert.dom().includesText('Interviewing');
    assert.dom().includesText('Rejected');
    assert.dom().includesText('Offer');
    assert.dom().includesText('Withdrawn');
    assert.dom().includesText('Tracking URL');
    assert.dom().includesText('Notes');
    assert.dom().includesText('Save');
  });
});
