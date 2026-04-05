import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class JobApplicationsShowController extends Controller {
  @service flashMessages;
  @service router;
  @action async destroyRecord(event) {
    event.preventDefault();
    if (!confirm('Delete application? This can not be undone')) return;
    const jobPost = this.model.jobPost;
    await this.model.destroyRecord();
    this.flashMessages.success('Application deleted.');
    this.router.transitionTo('job-posts.show', jobPost);
  }
}
