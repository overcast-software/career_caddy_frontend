import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsIndexRoute extends Route {
  @service store;
  model() {
    const jobPosts = this.store.findAll('job-post');
    return jobPosts
  }
}
