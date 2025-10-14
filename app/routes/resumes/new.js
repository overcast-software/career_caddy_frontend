import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesNewRoute extends Route {
  @service store;

  async model() {
    // Load source and eagerly load its relationships
    await this.store.findAll('company')
    // Create UNSAVED cloned resume
      const newResume = this.store.createRecord()

    return newResume; // UNSAVED until user explicitly saves
  }
}
