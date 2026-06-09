import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Per-company staff view. ``include=aliases`` requests the name-
// variant rows alongside the Company so <Companies::AliasesPanel>
// can render them without a follow-up query. The api will eventually
// sideload these via the CompanyAlias serializer; until that ships
// the panel handles an empty list gracefully.
export default class AdminCompaniesShowRoute extends Route {
  @service store;

  model(params) {
    return this.store.findRecord('company', params.company_id, {
      include: 'aliases',
    });
  }
}
