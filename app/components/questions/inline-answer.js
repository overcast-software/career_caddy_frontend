import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const TERMINAL_STATUSES = ['completed', 'done', 'failed', 'error'];

export default class QuestionsInlineAnswer extends Component {
  @service store;
  @service flashMessages;
  @service spinner;
  @service poller;

  @tracked answerContent = '';
  @tracked useAI = false;
  @tracked additionalPrompt = '';
  @tracked isPolling = false;
  @tracked answer = null;

  constructor() {
    super(...arguments);
    this.answer = this.store.createRecord('answer', {
      question: this.args.question,
    });
  }

  willDestroy() {
    super.willDestroy(...arguments);
    if (this.answer) {
      this.poller.stop(this.answer);
      if (this.answer.isNew) {
        this.answer.unloadRecord();
      }
    }
  }

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
    const answer = this.answer;
    const question = this.args.question;

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
        if (this.useAI) {
          this.isPolling = true;
          this.poller.watchRecord(saved, {
            isTerminal: (rec) => TERMINAL_STATUSES.includes(rec.status),
            onStop: (rec) => {
              this.isPolling = false;
              if (rec.status === 'failed' || rec.status === 'error') {
                this.flashMessages.danger('AI failed to generate an answer.');
              } else {
                this.flashMessages.success('AI answer generated.');
                this._reloadAndClose(question);
              }
            },
            onError: () => {
              this.isPolling = false;
              this.flashMessages.danger(
                'Lost connection while waiting for AI answer.',
              );
            },
          });
        } else {
          this.flashMessages.success('Answer saved.');
          this._reloadAndClose(question);
        }
      })
      .catch(() => {
        this.flashMessages.danger('Failed to save answer.');
      });
  }

  _reloadAndClose(question) {
    this.store
      .findRecord('question', question.id, {
        include: 'answers',
        reload: true,
      })
      .then(() => {
        if (this.args.onComplete) {
          this.args.onComplete();
        }
      });
  }
}
