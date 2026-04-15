import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class AnswersEditController extends Controller {
  @service store;
  @service flashMessages;
  @service router;

  @action deleteAnswer() {
    const questionId = this.model.belongsTo('question').id();
    this.model
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Answer deleted.');
        if (questionId) {
          this.router.transitionTo('questions.show.answers.index', questionId);
        } else {
          this.router.transitionTo('answers');
        }
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete answer.');
        }
      });
  }
}
