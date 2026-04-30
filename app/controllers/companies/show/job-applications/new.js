import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class CompaniesShowJobApplicationsNewController extends Controller {
  @service flashMessages;
  @service router;
  @tracked company = null;
  @tracked jobPostOptions = [];

  @action
  save() {
    if (!this.model.belongsTo('jobPost').value()) {
      this.flashMessages.warning('Please select a job post.');
      return;
    }
    this.model
      .save()
      .then((app) => {
        this.flashMessages.success('Application saved.');
        this.router.transitionTo('job-applications.show', app.id);
      })
      .catch((error) =>
        this.flashMessages.danger(
          'Failed to save application: ' + (error?.message ?? error),
        ),
      );
  }

  @action
  cancel() {
    this.model.rollbackAttributes();
    this.router.transitionTo(
      'companies.show.job-applications.index',
      this.company.id,
    );
  }
}
