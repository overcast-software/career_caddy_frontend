import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsNewRoute extends Route {
  @service store;

  model() {
    const jobPost = this.modelFor('job-posts.show');
    const company = jobPost?.belongsTo('company').value() ?? null;
    return this.store.createRecord('question', {
      jobPost,
      company,
    });
  }
}
