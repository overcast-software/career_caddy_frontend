import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class AnswersEditController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @action updateContent(event) {
    this.model.content = event.target.value;
  }
  @action updateFavorite(event) {
    this.model.favorite = event.target.checked;
  }
  @action saveAnswer(event) {
    event.preventDefault();
    this.model.save().then(() => {
      this.flashMessages.success('answer saved');
      this.router.transitionTo('answers.show', this.model);
    });
  }
  @action deleteAnswer() {
    this.model.destroyRecord().then(() => {
      this.flashMessages.success('Answer deleted');
    });
    this.router.transitionTo('questions.show.answers.index', this.model.question);
  }
}
