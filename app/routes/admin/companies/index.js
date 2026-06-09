import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Staff hub for the Phase A dedupe redesign. Lists every Company
// in the system so staff can spot duplicates and merge them via the
// per-company show page. Visibility is staff-only by the parent
// AdminRoute guard.
export default class AdminCompaniesIndexRoute extends Route {
  @service store;

  model() {
    return this.store.findAll('company');
  }
}
