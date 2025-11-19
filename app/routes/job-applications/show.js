import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsShowRoute extends Route {
  @service store
  @service flashMessages
  @service router
  async model({application_id}){
    if(!application_id){
      this.flashMessages.warning("redirecting to new")
      this.router.transitionTo("job-application.new")
    }
    return this.store.findRecord('job-application', application_id)
  }
}
