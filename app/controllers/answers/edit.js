import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class AnswersEditController extends Controller {
  @service store;
  @service flashMessages;
  @action updateContent(event) {
    this.model.content = event.target.value;
  }
  @action saveAnswer(event) {
    event.preventDefault();
    this.model.save().then(() => {
      this.flashMessages.success('answer saved');
    });
  }
  @action deleteAnswer() {
    this.model.destroyRecord().then(() => {
      this.flashMessages.success('called delete');
    });
  }
}
