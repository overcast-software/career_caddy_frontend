import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ResumesShowExperienceNewRoute extends Route {
  @service store;

  async model() {
    const resume = this.modelFor('resumes.show');
    await this.store.findAll('company');
    return this.store.createRecord('experience', { resume });
  }
}
