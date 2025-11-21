import Component from '@glimmer/component';
import { action } from '@ember/object';
export default class AnswersForm extends Component {
  @action updateContent(event) {
    const newContent = event.target.value;
    console.log(newContent)
    this.args.answer.set("content", newContent)
  }
  @action save(event) {
    event.preventDefault();
    this.args.answer.save();
  }
}
