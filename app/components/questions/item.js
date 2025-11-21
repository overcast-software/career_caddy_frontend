import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class QuestionsItem extends Component {
  @service flashMessages;
  @action askAI() {
    this.flashMessages.success('asking AI');
    const answer = this.store.createRecord('answer', {question})
    answer.save()
    this.args.question
  }
}
