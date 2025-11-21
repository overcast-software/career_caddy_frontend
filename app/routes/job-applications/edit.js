import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsEditRoute extends Route {
  @service store;
  @service router;
  async model({ application_id }) {
    if (!application_id) {
      //this happens when you navigate away from a new applicaiton
      //it's instantiated but there's not id
      //navigate back to new
      this.router.transitionTo('job-applications.new');
    }
    const jobApplication = this.store.findRecord(
      'job-application',
      application_id,
      {include: 'job-post,company'},
    );

    this.store.findAll('resume');
    this.store.findAll('cover-letter')
    return jobApplication
  }
}
