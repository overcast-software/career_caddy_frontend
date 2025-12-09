import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class JobApplicationsShowController extends Controller {
  @service flashMessages;
  @action destroyRecord(event) {
    event.preventDefault();
    if (!confirm('Deleted application?  This can not be undone')) return;
    this.model
      .destroy()
      .then(this.flashMessages.success('Application deleted.'));
  }
}
