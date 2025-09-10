import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ApplicationsEditRoute extends Route {
  @service store;

  model({ application_id }) {
    return this.store.findRecord('application', application_id);
  }
}
