import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsShowAnswersShowRoute extends Route {
  @service store;

  activate() {
    window.scrollTo(0, 0);
  }

  async model({ answer_id }) {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const { question_id } = this.paramsFor('job-posts.show.questions.show');
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    const question = this.store.peekRecord('question', question_id);
    const answer = await this.store.findRecord('answer', answer_id);
    return { answer, jobPost, question };
  }
}
