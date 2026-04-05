import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class JobApplicationsCompact extends Component {
  @service flashMessages;
  @service router;

  get jobApplication() {
    return this.args.jobApplication;
  }
  get jobPost() {
    return this.jobApplication?.jobPost;
  }
  @action delete() {
    const message = `${this.jobApplication.get('jobPost.title')}`;
    const allowed = confirm(`Are you sure you want to delete ${message}`);
    if (!allowed) {
      return;
    }
    const application = this.args.jobApplication;
    application
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Application removed.');
        this.args.onDelete?.(application);
      })
      .catch(() => {
        this.flashMessages.alert('Problem deleting application.');
      });
  }
}
