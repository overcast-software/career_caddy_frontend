import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsNewManualRoute extends Route {
  @service store;

  model() {
    this.store.findAll('company'); // to check if we need to create a new one
    return this.store.createRecord('job-post');
  }
}
