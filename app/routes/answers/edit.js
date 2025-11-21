import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class AnswersEditRoute extends Route {
  @service store;
  async model({answer_id}) {
    return this.store.findRecord('answer', answer_id);
  }
}
