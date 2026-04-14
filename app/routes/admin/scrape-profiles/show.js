import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AdminScrapeProfilesShowRoute extends Route {
  @service store;

  model({ scrape_profile_id }) {
    return this.store.findRecord('scrape-profile', scrape_profile_id);
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.extractionHints = model.extractionHints || '';
    controller.pageStructure = model.pageStructure || '';
    controller.cssSelectors = model.cssSelectors
      ? JSON.stringify(model.cssSelectors, null, 2)
      : '';
    controller.preferredTier = model.preferredTier || 'auto';
    controller.enabled = model.enabled ?? true;
  }
}
