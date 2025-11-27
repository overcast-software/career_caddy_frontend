import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
export default class CompaniesSelectOrCreate extends Component {
  @tracked showCreate = false;
  @tracked selectedCompany = null;
  @tracked companySelectFilter = this.args.companies

  @action toggleCreateForm() {
    this.showCreate = !this.showCreate
    console.log(this.showCreate)
  }

  get companyAndCreate(){
    return this.args.companies
  }

  @action companyFilter(company) {
    this.selectedCompany = company;
    const jobApplications = this.store.peekAll('job-application');
    this.companySelectFilter = jobApplications.filter((jobApp) => {
      return jobApp.get('jobPost.company.id') === this.selectedCompany.id;
    });
  }
}
