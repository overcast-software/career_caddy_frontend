import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowScrapesRoute extends Route {
  @service store;

  async model() {
    const jobPost = this.modelFor('job-posts.show');
    return await jobPost.scrapes;
  }
}
