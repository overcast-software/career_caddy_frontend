import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsEditRoute extends Route {
  @service store;

  async model({ job_post_id }) {
    return await this.store.findRecord('job-post', job_post_id, {
      include: 'company',
    });
  }
}
