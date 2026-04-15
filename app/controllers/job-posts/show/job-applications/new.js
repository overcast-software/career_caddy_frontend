import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowJobApplicationsNewController extends Controller {
  @service flashMessages;
  @service router;

  @action async save() {
    try {
      const app = await this.model.save();
      this.flashMessages.success('Application saved.');
      this.router.transitionTo('job-applications.show', app.id);
    } catch {
      this.flashMessages.danger('Failed to save application.');
    }
  }

  @action cancel() {
    this.model.rollbackAttributes();
    this.router.transitionTo('job-posts.show', this.model.get('jobPost.id'));
  }
}
