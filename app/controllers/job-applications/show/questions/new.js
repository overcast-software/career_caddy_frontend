import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobApplicationsShowQuestionsNewController extends Controller {
  @service flashMessages;
  @service router;

  @action onSave() {
    const { job_application_id } =
      this.router.currentRoute.parent.parent.params;
    this.router.transitionTo(
      'job-applications.show.questions',
      job_application_id,
    );
  }
}
