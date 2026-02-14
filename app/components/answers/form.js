import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
export default class AnswersForm extends Component {
  @service flashMessages;
  @tracked additionalPrompt = '';
  @tracked useAI = false;
  @action updateContent(event) {
    const newContent = event.target.value;
    console.log(newContent);
    this.args.answer.set('content', newContent);
  }
  @action updateAdditionalPrompt(event) {
    this.additionalPrompt = event.target.value;
    if (this.useAI) {
      this.args.answer.set('prompt', event.target.value);
      this.args.answer.set('ai_assist', true);
    }
  }
  @action toggleAI() {
    this.useAI = !this.useAI;
    if (this.useAI) {
      // When enabling AI, store the additional prompt in the model and set ai_assist flag
      this.args.answer.set('prompt', this.additionalPrompt);
      this.args.answer.set('ai_assist', true);
    } else {
      // When disabling AI, clear the prompt from the model and disable ai_assist
      this.args.answer.set('prompt', null);
      this.args.answer.set('ai_assist', false);
    }
  }
  @action save(event) {
    event.preventDefault();
    this.args.answer
      .save()
      .then(this.flashMessages.success('Successfully saved answer'));
  }
  @action async toggleFavorite(answer) {
    answer.favorite = !answer.favorite;
  }
}
