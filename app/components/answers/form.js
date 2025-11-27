import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class AnswersForm extends Component {
@service flashMessages
  @action updateContent(event) {
    const newContent = event.target.value;
    console.log(newContent)
    this.args.answer.set("content", newContent)
  }
  @action save(event) {
    event.preventDefault();
    this.args.answer.save()
        .then(this.flashMessages.success('Successfully saved answer'))
  }
}
