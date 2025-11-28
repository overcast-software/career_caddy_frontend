import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class QuestionsItem extends Component {
  @service flashMessages;
  @service store;
  @action askAI() {
    this.args.askAI(this.args.question)
  }
}
