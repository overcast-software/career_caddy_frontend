import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class AnswersEditController extends Controller {
  @service store;
  @service flashMessages;
  @service router;

  get textareaRows() {
    const content = this.model?.content ?? '';
    const lines = content.split('\n').length;
    return Math.max(8, lines + 2);
  }

  @action updateContent(event) {
    this.model.content = event.target.value;
  }
  @action toggleFavorite() {
    this.model.favorite = !this.model.favorite;
  }
  @action saveAnswer(event) {
    event.preventDefault();
    this.model.save().then(() => {
      this.store.peekRecord('career-data', '1')?.markDirty();
      this.flashMessages.success('answer saved');
      this.router.transitionTo('answers.show', this.model);
    });
  }
  @action deleteAnswer() {
    this.model.destroyRecord().then(() => {
      this.flashMessages.success('Answer deleted');
    });
    this.router.transitionTo(
      'questions.show.answers.index',
      this.model.question,
    );
  }
}
