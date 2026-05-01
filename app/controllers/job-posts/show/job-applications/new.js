import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowJobApplicationsNewController extends Controller {
  @service flashMessages;
  @service router;

  @action async save() {
    try {
      await this.model.save();
      this.flashMessages.success('Application saved.');
      this.router.transitionTo(
        'job-posts.show.job-applications.index',
        this.model.get('jobPost.id'),
      );
    } catch {
      this.flashMessages.danger('Failed to save application.');
    }
  }

  @action cancel() {
    this.model.rollbackAttributes();
    this.router.transitionTo('job-posts.show', this.model.get('jobPost.id'));
  }
}
