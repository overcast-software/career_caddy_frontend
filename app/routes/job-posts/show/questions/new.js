import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsNewRoute extends Route {
  @service store;

  model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    const companyId = jobPost?.get('company.id');
    const company = companyId
      ? this.store.peekRecord('company', companyId)
      : null;
    const question = this.store.createRecord('question', {
      jobPost,
      company,
    });
    return { question, jobPost };
  }
}
