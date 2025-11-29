import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class CompaniesIndexController extends Controller {
  @service flashMessages
  @service store
  @action async deleteCompany(company){
    console.log(company)
    const name = company.name;
    try {
      await company.destroyRecord();
      this.flashMessages.success(`deleted ${name}`);
    } catch (error) {
      this.flashMessages.danger('Failed to delete company');
    }
  }

  get sortedCompanies(){
    const list = this.model;
    if (!list || typeof list.length !== 'number') return [];
    const copy = Array.prototype.slice.call(list);
    return copy.sort((a, b) => {
      const an = Number(a.id);
      const bn = Number(b.id);
      if (Number.isFinite(an) && Number.isFinite(bn)) {
        // numeric descending
        return bn - an;
      }
      // Fallback: string compare descending when IDs aren't numeric
      return String(a.id).localeCompare(String(b.id)) * -1;
    });
  }

}
