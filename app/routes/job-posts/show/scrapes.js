import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowScrapesRoute extends Route {
  @service store;

  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    return await jobPost.scrapes;
  }
}
