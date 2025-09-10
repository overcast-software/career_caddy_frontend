import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ApplicationsIndexRoute extends Route {
  @service store;

  model() {
    return this.store.findAll('application');
  }
}
