import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsNewRoute extends Route {
  @service store;
  async model() {
    this.store.findAll('job-post', { reload: true });
    this.store.findAll('resume', { reload: true });
    this.store.findAll('cover-letter', { reload: true });
    return this.store.createRecord('job-application');
  }
}
