import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AdminScrapeProfilesIndexRoute extends Route {
  @service store;

  async model() {
    return this.store.findAll('scrape-profile');
  }
}
