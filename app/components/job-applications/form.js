import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class JobApplicationsForm extends Component {
  @service store;
  @service currentUser;
  @action updateNotes(event) {
    this.args.jobApplication.notes = event.target.value;
  }
}
