import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class QuestionsShowRoute extends Route {
  @service store;
  @service flashMessages;
  async model({ question_id }) {
    return this.store.findRecord('question', question_id, {
      include: 'company,job-application,answer',
    });
  }
}
