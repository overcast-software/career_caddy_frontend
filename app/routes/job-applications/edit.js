import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsEditRoute extends Route {
  @service store;

  async model({ application_id }) {
    await Promise.all([
      this.store.query('resume', { slim: 1 }),
      this.store.findAll('cover-letter'),
    ]);
    return this.store.findRecord('job-application', application_id);
  }
}
