import Controller from '@ember/controller';
import { service } from '@ember/service';
export default class QuestionsShowController extends Controller {
  @service flashMessages;
  get answers(){
    return this.model.answers
  }
}
