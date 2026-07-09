import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowScoresRoute extends Route {
  @service store;

  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    await Promise.all([
      // Pattern 3 (sub-collection read): GET /job-posts/:id/scores/ via the
      // score adapter's urlForQuery, instead of the flat
      // /scores/?filter[job_post_id]=... collection. Results carry the
      // job-post relationship, so the inverse hasMany('scores') hydrates.
      this.store.query('score', { jobPostId: job_post_id }),
      // Populate the New-Score resume dropdown. It only renders name/title,
      // so request just those and skip meta=counts — counts trigger a
      // per-resume COUNT fan-out server-side and nothing here consumes them.
      this.store.query('resume', { 'fields[resume]': 'name,title' }),
    ]);
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    return jobPost.hasMany('scores').value();
  }
}
