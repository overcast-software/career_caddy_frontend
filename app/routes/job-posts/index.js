import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsIndexRoute extends Route {
  @service store;
  async model() {
    await this.store.findRecord('user', 1);
    await this.store.findAll('resume');

    const jobPosts = this.store.findAll('job-post');
    return jobPosts
  }
}
