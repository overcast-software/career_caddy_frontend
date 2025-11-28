import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class QuestionsShowController extends Controller {
  @service flashMessages;
  @service store;
  @action deleteQuestion(){
    this.model.destroyRecord()
        .then(this.flashMessages.success('deleted question'))
  }
  get answers(){
    return this.model.answers
  }

  @action askAI(question){
    this.flashMessages.success('asking AI');
    const answer = this.store.createRecord('answer', {question, ai_assist: true})
    answer.save()
          .then(()=> this.flashMessages.success("answer returned"))
  }
}
