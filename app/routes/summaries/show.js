import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class SummariesShowRoute extends Route {
@service store
  async model({summary_id}){
    return this.store.findRecord('summary', summary_id, {include: 'job-post'})
  }
}
