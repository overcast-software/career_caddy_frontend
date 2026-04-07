import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

const TERMINAL_STATUSES = ['completed', 'done', 'failed', 'error'];
const POLL_INTERVAL_MS = 3000;

export default class AnswersForm extends Component {
  @service flashMessages;
  @service poller;
  @service router;
  @service spinner;
  @tracked additionalPrompt = '';
  @tracked useAI = false;
  @tracked isPolling = false;

  willDestroy() {
    super.willDestroy(...arguments);
    if (this.args.answer) {
      this.poller.stop(this.args.answer);
    }
  }

  @action updateContent(event) {
    this.args.answer.set('content', event.target.value);
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
      this.args.answer.set('prompt', this.additionalPrompt);
      this.args.answer.set('ai_assist', true);
    } else {
      this.args.answer.set('prompt', null);
      this.args.answer.set('ai_assist', false);
    }
  }

  @action async save(event) {
    event.preventDefault();
    const wasNew = this.args.answer.isNew;
    const question = this.args.answer.question;

    const afterSave = () => {
      if (this.args.onSave) {
        this.args.onSave(this.args.answer);
      } else if (question) {
        this.router.transitionTo(
          'questions.show.answers.show',
          this.args.answer,
        );
      }
    };

    try {
      await this.args.answer.save();
      if (this.useAI) {
        this.isPolling = true;
        this.spinner.begin({ label: 'AI is generating your answer…' });
        this.poller.watchRecord(this.args.answer, {
          intervalMs: POLL_INTERVAL_MS,
          isTerminal: (rec) => TERMINAL_STATUSES.includes(rec.status),
          onStop: (rec) => {
            this.isPolling = false;
            this.spinner.end();
            if (rec.status === 'failed' || rec.status === 'error') {
              this.flashMessages.danger('AI failed to generate an answer.');
            } else {
              this.flashMessages.success('AI answer generated successfully.');
              this.useAI = false;
              afterSave();
            }
          },
          onError: () => {
            this.isPolling = false;
            this.spinner.end();
            this.flashMessages.danger(
              'Lost connection while waiting for AI answer.',
            );
          },
        });
      } else {
        this.flashMessages.success('Successfully saved answer');
        afterSave();
      }
    } catch {
      this.flashMessages.danger('Failed to save answer.');
    }
  }

  @action async toggleFavorite(answer) {
    answer.favorite = !answer.favorite;
  }
}
