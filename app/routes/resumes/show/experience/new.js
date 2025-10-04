import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ResumesShowExperienceNewRoute extends Route {
  @service store;

  model() {
    const resume = this.modelFor('resumes.show');
    return this.store.createRecord('experience', { resume });
  }
}
