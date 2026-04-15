import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowScoresRoute extends Route {
  @service store;

  async model() {
    const jobPost = this.modelFor('job-posts.show');
    const [scores] = await Promise.all([
      jobPost.scores,
      this.store.query('resume', { slim: 1 }),
    ]);
    return scores;
  }
}
