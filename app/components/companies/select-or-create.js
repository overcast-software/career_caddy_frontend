import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class CompaniesSelectOrCreate extends Component {
  @service store;
  @service flashMessages;
  @tracked showCreate = false;
  @tracked selectedCompany = null;
  @tracked companySelectFilter = this.args.companies
  @tracked proposedCompanyName = null;
  @tracked labelText = "Select a company (option to create if no results)"

  @action toggleCreateForm() {
    this.showCreate = !this.showCreate
    console.log(this.showCreate)
  }

  @action updateCompany(company) {
    //do this in case someone uses clipboard and now keydown
    this.proposedCompanyName = company.name
    // this is the regular behaviour
    this.selectedCompany = company;
  }

  @action companyFilter(company) {
    this.args.companyCallback?.(company)
  }

  @action selectInput(text, select, event){
    if (select.results.length === 0){
      this.labelText = `Press Enter to create a company ${text}`
      this.proposedCompanyName = text
    }
  }

  @action companyKeydown(dropdown, e){
    if ( dropdown.results.length === 0 && e.key === "Enter" ){
      const company = this.store.createRecord('company',{name: this.proposedCompanyName})
      company.save()
             .then(this.flashMessages.success(`created company ${company.name}` ))
    }
  }
}
