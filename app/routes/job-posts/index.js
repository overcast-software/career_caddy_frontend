import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsIndexRoute extends Route {
  @service store;

  model() {
    return this.store.findAll('job-post');
  }
}
