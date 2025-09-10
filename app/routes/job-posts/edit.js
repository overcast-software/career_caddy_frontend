import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsEditRoute extends Route {
  @service store;

  model({ job_post_id }) {
    return this.store.findRecord('job-post', job_post_id);
  }
}
