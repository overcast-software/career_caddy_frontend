import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class QuestionsShowController extends Controller {
  @service flashMessages;
  @action deleteQuestion(){
    this.model.destroyRecord()
        .then(this.flashMessages.success('deleted question'))
  }
  get answers(){
    return this.model.answers
  }
}
