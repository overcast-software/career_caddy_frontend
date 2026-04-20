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
    const application = this.args.jobApplication;
    if (application?.isNew) {
      application.rollbackAttributes();
      this.flashMessages.success('Draft discarded.');
      this.args.onDelete?.(application);
      return;
    }
    const message = `${application.get('jobPost.title')}`;
    const allowed = confirm(`Are you sure you want to delete ${message}`);
    if (!allowed) {
      return;
    }
    application
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Application removed.');
        this.args.onDelete?.(application);
      })
      .catch(() => {
        this.flashMessages.danger('Failed to delete application.');
      });
  }
}
