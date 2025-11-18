import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class JobApplicationsCompact extends Component {
  @service flashMessages;
  @service router;

  @action delete() {
    this.args.jobApplication
      .destroyRecord()
      .then((record) => {
        this.flashMessages.success(`removed application #${record.id}`);
      })
      .catch((error) => { this.flashMessages.alert(`problem deleting`)});
  }
}
