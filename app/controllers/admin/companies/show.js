import Controller from '@ember/controller';
import { service } from '@ember/service';

// Controller for /admin/companies/:company_id. Presentation only —
// AliasesPanel owns its own state; relate-actions live on
// /admin/companies?source=<id>.
export default class AdminCompaniesShowController extends Controller {
  @service flashMessages;
}
