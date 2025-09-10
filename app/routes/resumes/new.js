import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesNewRoute extends Route {
  @service store;

  model() {
    return this.store.createRecord('resume');
  }
}
