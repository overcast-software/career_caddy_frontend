import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import jobApplicationSerialized from 'career-caddy-frontend/tests/fixtures/job_application_serialized';

module('Integration | Component | job-applications/edit', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    const currentUser = this.owner.lookup('service:current-user');
    currentUser.user.resumes = [{ id: 'r2', name: 'Other Resume' }];
    currentUser.user.coverLetters = [];
  });
  test('it renders', async function (assert) {
    const serialized = jobApplicationSerialized.data;
    const attrs = serialized.attributes;
    const rels = serialized.relationships;

    class StubJobApplication {
      constructor() {
        this.status = attrs.status;
        this.trackingUrl = attrs.tracking_url;
        this.notes = attrs.notes;
        this.appliedAt = new Date(attrs.applied_at);

        // Seed relationships from the serialized payload while keeping
        // names from the previous test for clear labels.
        this.resume = { id: rels.resume.data.id, name: 'Primary Resume' };
        this.coverLetter = {
          id: 'cl1',
          createdAt: new Date('2025-10-30T00:00:00-07:00'),
        };
        this.jobPost = { id: rels.job_post.data.id };
      }

      belongsTo(name) {
        if (name === 'coverLetter') {
          return {
            id: () => this.coverLetter?.id ?? '',
            value: () => this.coverLetter ?? null,
          };
        }
        if (name === 'jobPost') {
          return {
            id: () => this.jobPost?.id ?? '',
            value: () => null, // not needed for this test's assertions
          };
        }
        return { id: () => '', value: () => null };
      }

      async save() {
        return this;
      }
    }

    await this.set('jobApplication', new StubJobApplication());

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
