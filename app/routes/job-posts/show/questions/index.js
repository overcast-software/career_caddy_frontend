import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobPostsShowQuestionsIndexRoute extends Route {
  @service store;
  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const jobPost = await this.store.findRecord('job-post', job_post_id, {
      include: ['question', 'job-application'],
    });
    const questions = await jobPost.questions;
    return { jobPost, questions };
  }
}
