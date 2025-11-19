import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SummariesIndexRoute extends Route {
  @service store;
  @service currentUser;

  model() {
    return this.store.findAll('summary');
  }
}
