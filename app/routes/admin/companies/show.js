import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Per-company staff view. The api CompanySerializer does not yet
// emit ``relationships.aliases`` and there is no
// ``/companies/:id/aliases/`` sub-collection endpoint, so
// ``include=aliases`` is intentionally omitted here — passing it
// was the trigger for a runaway fetch loop on this route. When the
// CompanyAlias serializer ships, restore the include and re-add the
// <Companies::AliasesPanel> render in the template.
export default class AdminCompaniesShowRoute extends Route {
  @service store;

  model(params) {
    return this.store.findRecord('company', params.company_id);
  }
}
