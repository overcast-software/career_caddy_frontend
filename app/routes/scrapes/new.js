import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ScrapesNewRoute extends Route {
  @service store;

  model() {
    return this.store.createRecord('scrape');
  }
}
