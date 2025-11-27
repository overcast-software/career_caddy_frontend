import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class CompaniesSelector extends Component {
  @service store;
  @service flashMessages;
  @tracked selectedCompany;
  @action updateCompany(company) {
    if (this.args.companyCallback){
      this.args.companyCallback(company)
    }
    this.selectedCompany = company;
  }
  get placeHolder(){
    return this.args.placeHolder || "placeholder"
  }
  get labelText(){
    return this.args.labelText || "Select a company"
  }
}
