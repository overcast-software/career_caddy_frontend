import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsEditRoute extends Route {
  @service store;
  @service router;
  beforeModel({ application_id }) {
    //this happens when you navigate away from a new applicaiton
    //it's instantiated but there's not id
    //navigate back to new
    if (!application_id) {
      this.router.transitionTo('job-applications.new');
    }
  }
  async model({ application_id }) {
    return await this.store.findRecord('application', application_id, {
      include: 'job-post,company,cover-letter',
    });
  }
}
