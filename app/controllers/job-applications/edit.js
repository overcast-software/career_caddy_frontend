import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class JobApplicationsEditController extends Controller {
  @service flashMessages;
  @action save() {
    this.model
      .save()
      .catch((error) => this.flashMessages.alert(error))
      .then(() => this.flashMessages.success('save complete'));
  }
  resumeSelectId() {
    return 1;
  }
  @action updateResume() {
    debugger;
  }
  @action updateCoverLetter() {
    debugger;
  }
  @action updateField() {}
}
