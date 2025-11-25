import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class CompaniesIndexController extends Controller {
  @service flashMessages
  @service store
  @action deleteCompany(company){
    console.log(company)
    company.destroyRecord()
           .then((company) => this.flashMessages.success('deleted ' + company.name))
  }

}
