import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsIndexRoute extends Route {
  @service store;

  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    return await this.store.query('question', {
      'filter[job_post_id]': job_post_id,
      include: 'answers',
    });
  }
}
