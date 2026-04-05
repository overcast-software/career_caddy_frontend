import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsNewRoute extends Route {
  @service store;

  model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    return this.store.createRecord('question', { jobPost });
  }
}
