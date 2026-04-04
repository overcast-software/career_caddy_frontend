import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class SummariesForm extends Component {
  @action
  updateContent(event) {
    this.args.summary.content = event.target.value;
  }
}
