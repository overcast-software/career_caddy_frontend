import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class QuestionsInlineAnswer extends Component {
  @service store;
  @service flashMessages;
  @service spinner;
  @service poller;
  @service router;

  @tracked answerContent = '';
  @tracked useAI = false;
  @tracked additionalPrompt = '';
  @tracked isPolling = false;

  @action toggleAI() {
    this.useAI = !this.useAI;
  }

  @action updateAnswerContent(event) {
    this.answerContent = event.target.value;
  }

  @action updateAdditionalPrompt(event) {
    this.additionalPrompt = event.target.value;
  }

  @action submit(event) {
    event.preventDefault();
    const question = this.args.question;
    const answer = this.store.createRecord('answer', { question });

    if (this.useAI) {
      answer.ai_assist = true;
      answer.prompt = this.additionalPrompt || null;
    } else {
      answer.content = this.answerContent;
      answer.ai_assist = false;
    }

    this.spinner
      .wrap(answer.save(), { label: 'Saving answer…' })
      .then((saved) => {
        this.flashMessages.success(
          this.useAI ? 'Answer submitted to AI.' : 'Answer saved.',
        );
        if (this.args.onSave) {
          this.args.onSave(saved, question);
        } else {
          this.router.transitionTo(
            'questions.show.answers.show',
            question.id,
            saved.id,
          );
        }
      })
      .catch(() => {
        answer.unloadRecord();
        this.flashMessages.danger('Failed to save answer.');
      });
  }
}
