import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowCoverLettersRoute extends Route {
  @service store;

  async model() {
    const jobPost = this.modelFor('job-posts.show');
    const [coverLetters] = await Promise.all([
      jobPost.coverLetters,
      this.store.query('resume', { slim: 1 }),
    ]);
    return coverLetters;
  }
}
