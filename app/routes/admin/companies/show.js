import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Per-company staff view. ``include=aliases,canonical`` sideloads
// the Phase A self-FK relationships so <Companies::AliasesPanel>
// resolves ``company.hasMany('aliases').value()`` synchronously on
// first paint without a follow-up GET. The api ships these
// relationships as Company resources (api PR #176 — Phase A).
export default class AdminCompaniesShowRoute extends Route {
  @service store;

  model(params) {
    return this.store.findRecord('company', params.company_id, {
      include: 'aliases,canonical',
    });
  }
}
