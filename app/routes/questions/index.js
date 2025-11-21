import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class QuestionsIndexRoute extends Route {
  @service store;
  async model(){
    this.store.findAll('company')
    return this.store.findAll('question')
  }
}
