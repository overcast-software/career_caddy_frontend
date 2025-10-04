import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ResumesShowExperienceShowRoute extends Route {
  @service store;

  model({ experience_id }) {
    return this.store.findRecord('experience', experience_id);
  }
}
