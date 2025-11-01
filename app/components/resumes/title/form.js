import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ResumesTitleForm extends Component {
  @action updateTitle(event) {
    this.args.resume.title = event.target.value;
  }
  @action updateName(event) {
    this.args.resume.name = event.target.value;
  }
  @action updateNotes(event) {
    this.args.resume.notes = event.target.value;
  }
}
