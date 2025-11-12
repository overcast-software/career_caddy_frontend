import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesShowRoute extends Route {
  @service store;

  model({ resume_id }) {
    const resume = this.store.findRecord('resume', resume_id, {
      include: 'skill,experience,education,certification,summary',
    });
    return resume;
  }
}
