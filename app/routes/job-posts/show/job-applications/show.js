import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationsShowRoute extends Route {
  @service store;

  async model({ job_application_id }) {
    return this.store.findRecord('job-application', job_application_id, {
      include: 'application-statuses',
    });
  }
}
