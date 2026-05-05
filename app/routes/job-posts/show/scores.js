import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowScoresRoute extends Route {
  @service store;

  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    await Promise.all([
      this.store.query('score', { 'filter[job_post_id]': job_post_id }),
      this.store.query('resume', { slim: 1 }),
    ]);
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    return jobPost.hasMany('scores').value();
  }
}
