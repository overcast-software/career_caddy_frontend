import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesShowRoute extends Route {
  @service store;

  model({ resume_id }) {
    return this.store.findRecord('resume', resume_id);
  }
}
