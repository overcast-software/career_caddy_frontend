import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Per-company staff view. Loads the parent Company with
// ``include=aliases,canonical`` (Phase A self-FK so
// <Companies::AliasesPanel> resolves the alias roster + canonical
// pointer synchronously). Relate-actions (merge / mark-alias both
// directions) live on /admin/companies?source=<id>, the existing
// staff search surface — this page is presentation only.
export default class AdminCompaniesShowRoute extends Route {
  @service store;

  model({ company_id }) {
    return this.store.findRecord('company', company_id, {
      include: 'aliases,canonical',
    });
  }
}
