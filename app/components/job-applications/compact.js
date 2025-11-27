import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class JobApplicationsCompact extends Component {
  @service flashMessages;
  @service router;

  get jobApplication() {
    return this.args.jobApplication;
  }
  @action delete() {
    const message = `${this.jobApplication.get('jobPost.title')}`;
    const allowed = confirm(`Are you sure you want to delete ${message}`);
    if (!allowed) { return }
    this.args.jobApplication
      .destroyRecord()
      .then((record) => {
        this.flashMessages.success(`removed application #${record.id}`);
      })
      .catch((error) => {
        this.flashMessages.alert(`problem deleting`);
      });
  }
}
