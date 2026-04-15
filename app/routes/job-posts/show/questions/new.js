import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsNewRoute extends Route {
  @service store;

  model() {
    const jobPost = this.modelFor('job-posts.show');
    const companyId = jobPost?.get('company.id');
    const company = companyId
      ? this.store.peekRecord('company', companyId)
      : null;
    return this.store.createRecord('question', {
      jobPost,
      company,
    });
  }
}
