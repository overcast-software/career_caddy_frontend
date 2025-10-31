import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsEditRoute extends Route {
  @service store;
  @service currentUser;
  async model({ application_id }) {
    const app = await this.store.findRecord('application', application_id, {
      include: 'job-post,company,cover-letter',
    });
    return app;
  }
}
