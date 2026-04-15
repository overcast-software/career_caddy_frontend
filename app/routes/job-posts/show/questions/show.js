import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsShowRoute extends Route {
  @service store;

  async model({ question_id }) {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    const question = await this.store.findRecord('question', question_id, {
      include: 'answers',
      reload: true,
    });
    return { jobPost, question };
  }
}
