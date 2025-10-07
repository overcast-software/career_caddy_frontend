import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ResumesTitleForm extends Component {
  @action
  updateTitle(event) {
    this.args.resume.title = event.target.value;
  }
}
