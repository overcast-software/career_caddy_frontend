import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobApplicationsEditController extends Controller {
  @service flashMessages;
  @service router;

  @action async save() {
    try {
      await this.model.save();
      this.flashMessages.success('Application saved.');
      this.router.transitionTo('job-applications.show', this.model.id);
    } catch (error) {
      this.flashMessages.danger(
        error?.errors?.[0]?.detail ?? 'Failed to save application.',
      );
    }
  }

  @action cancel() {
    this.model.rollbackAttributes();
    this.router.transitionTo('job-applications.show', this.model.id);
  }
}
