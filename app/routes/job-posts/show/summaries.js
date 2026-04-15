import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowSummariesRoute extends Route {
  @service store;

  async model() {
    const jobPost = this.modelFor('job-posts.show');
    const [summaries] = await Promise.all([
      jobPost.summaries,
      this.store.query('resume', { slim: 1 }),
    ]);
    return summaries;
  }
}
