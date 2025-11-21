import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class AnswersEditController extends Controller {
  @service store;
  @service flashMessages;
  @action saveAnswer(event) {
    event.preventDefault();
    // this.model.save()
    this.flashMessages.success('called save')
  }
  @action deleteAnswer(event){
    // this.model.destroyRecord()
    this.flashMessages.success('called delete')
  }
}
