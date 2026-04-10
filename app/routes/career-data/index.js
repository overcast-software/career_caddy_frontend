import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CareerDataIndexRoute extends Route {
  @service store;

  async model() {
    const cached = this.store.peekRecord('career-data', '1');
    if (cached && !cached.isDirty) {
      return cached;
    }
    this.store.unloadAll('career-data');
    return this.store.queryRecord('career-data', {});
  }
}
