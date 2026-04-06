import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const TERMINAL_STATUSES = ['completed', 'done', 'failed', 'error'];
const POLL_INTERVAL_MS = 3000;

export default class JobPostsShowQuestionsIndexController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;
  @service poller;

  @tracked answeringQuestionId = null;
  @tracked newAnswer = null;
  @tracked answerContent = '';
  @tracked useAI = false;
  @tracked additionalPrompt = '';
  @tracked isPollingAnswerId = null;

  get jobPostId() {
    return this.router.currentRoute.parent.params.job_post_id;
  }

  @action startAnswering(question) {
    if (this.newAnswer?.isNew) {
      this.newAnswer.unloadRecord();
    }
    this.answeringQuestionId = question.id;
    this.newAnswer = this.store.createRecord('answer', { question });
    this.answerContent = '';
    this.useAI = false;
    this.additionalPrompt = '';
  }

  @action cancelAnswer() {
    if (this.newAnswer?.isNew) {
      this.newAnswer.unloadRecord();
    }
    this.newAnswer = null;
    this.answeringQuestionId = null;
    this.answerContent = '';
    this.useAI = false;
    this.additionalPrompt = '';
  }

  @action updateAnswerContent(event) {
    this.answerContent = event.target.value;
  }

  @action toggleAI() {
    this.useAI = !this.useAI;
  }

  @action updateAdditionalPrompt(event) {
    this.additionalPrompt = event.target.value;
  }

  @action async submitAnswer(event) {
    event.preventDefault();
    const answer = this.newAnswer;
    const question = answer.question;

    if (this.useAI) {
      answer.ai_assist = true;
      answer.prompt = this.additionalPrompt || null;
    } else {
      answer.content = this.answerContent;
      answer.ai_assist = false;
    }

    try {
      const saved = await this.spinner.wrap(answer.save(), {
        label: 'Saving answer…',
      });

      if (this.useAI) {
        this.isPollingAnswerId = saved.id;
        this.poller.watchRecord(saved, {
          intervalMs: POLL_INTERVAL_MS,
          isTerminal: (rec) => TERMINAL_STATUSES.includes(rec.status),
          onStop: async (rec) => {
            this.isPollingAnswerId = null;
            this.answeringQuestionId = null;
            this.newAnswer = null;
            if (rec.status === 'failed' || rec.status === 'error') {
              this.flashMessages.danger('AI failed to generate an answer.');
            } else {
              this.flashMessages.success('AI answer generated.');
              await this.store.findRecord('question', question.id, {
                include: 'answers',
                reload: true,
              });
            }
          },
          onError: () => {
            this.isPollingAnswerId = null;
            this.answeringQuestionId = null;
            this.newAnswer = null;
            this.flashMessages.danger(
              'Lost connection while waiting for AI answer.',
            );
          },
        });
      } else {
        this.answeringQuestionId = null;
        this.newAnswer = null;
        this.answerContent = '';
        this.flashMessages.success('Answer saved.');
        await this.store.findRecord('question', question.id, {
          include: 'answers',
          reload: true,
        });
      }
    } catch {
      this.flashMessages.danger('Failed to save answer.');
    }
  }

  @action async deleteQuestion(question) {
    if (!window.confirm('Delete this question?')) return;
    try {
      await question.destroyRecord();
      this.flashMessages.success('Question deleted.');
    } catch {
      this.flashMessages.danger('Failed to delete question.');
    }
  }

  @action editQuestion(question) {
    this.router.transitionTo('questions.edit', question);
  }
}
