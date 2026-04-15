import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class CompaniesEditController extends Controller {
  @service flashMessages;
  @service router;

  @action deleteCompany() {
    if (!confirm(`Delete ${this.model.name}?`)) return;
    this.model
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Company deleted.');
        this.router.transitionTo('companies.index');
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete company.');
        }
      });
  }
}
