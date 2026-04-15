import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class AnswersEditController extends Controller {
  @service store;
  @service flashMessages;
  @service router;

  @action deleteAnswer() {
    this.model
      .destroyRecord()
      .then(() => {
        this.store.peekRecord('career-data', '1')?.markDirty();
        this.flashMessages.success('Answer deleted.');
        this.router.transitionTo(
          'questions.show.answers.index',
          this.model.question,
        );
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete answer.');
        }
      });
  }
}
