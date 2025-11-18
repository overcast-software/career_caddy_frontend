import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsShowRoute extends Route {
  @service store
  async model({application_id}){
    return this.store.findRecord('job-application', application_id)
  }
}
