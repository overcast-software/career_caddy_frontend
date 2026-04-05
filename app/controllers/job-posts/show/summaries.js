import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowSummariesController extends Controller {
  @service store;
  @service router;
  @service flashMessages;
  @service spinner;

  get jobPostId() {
    return this.router.currentRoute.parent.params.job_post_id;
  }

  @action async createSummary() {
    const jobPost = this.store.peekRecord('job-post', this.jobPostId);
    const summary = this.store.createRecord('summary', { jobPost, content: '' });
    try {
      const saved = await this.spinner.wrap(summary.save(), { label: 'Creating summary…' });
      this.router.transitionTo('summaries.show', saved);
    } catch {
      summary.unloadRecord();
      this.flashMessages.danger('Failed to create summary.');
    }
  }
}
