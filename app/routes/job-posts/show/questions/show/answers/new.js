import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsShowAnswersNewRoute extends Route {
  @service store;

  model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const { question_id } = this.paramsFor('job-posts.show.questions.show');
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    const question = this.store.peekRecord('question', question_id);
    return {
      answer: this.store.createRecord('answer', { question }),
      jobPost,
      question,
    };
  }
}
