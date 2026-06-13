import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Per-company staff view. Loads the parent Company with
// ``include=aliases,canonical`` (Phase A self-FK so
// <Companies::AliasesPanel> resolves synchronously). The
// SearchTable's InfinityModel is owned by the controller — keeps
// the route hook simple and avoids hash-model refresh churn.
export default class AdminCompaniesShowRoute extends Route {
  @service store;

  model({ company_id }) {
    return this.store.findRecord('company', company_id, {
      include: 'aliases,canonical',
    });
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.isSearching = false;
    // Build (or rebuild) the InfinityModel from the current `search`
    // queryParam — covers cold-loads with ?search=… and route
    // re-entries with a fresh search value.
    controller.refreshResults();
  }
}
