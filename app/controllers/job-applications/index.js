import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
export default class JobApplicationsIndexController extends Controller {
  @service flashMessages;
  @service store;
  statuses = [
    'Saved',
    'Applied',
    'Interviewing',
    'Rejected',
    'Offer',
    'Withdrawn',
  ];
  @tracked companySelectFilter = this.store.peekAll('job-application');
  @tracked statusSelectFilter = this.store.peekAll('job-application');
  @tracked selectedStatus = null;
  @tracked selectedCompany = null;
  @tracked labelText = "Select a company"
  @tracked proposedCompanyName = null
  get fullFilter() {
    return this.companySelectFilter.filter((jobApplication) =>
      this.statusSelectFilter.includes(jobApplication),
    );
  }
  get companies() {
    return this.store.findAll('company');
  }

  @action companyFilter(company) {
    this.selectedCompany = company;
    const jobApplications = this.store.peekAll('job-application');
    this.companySelectFilter = jobApplications.filter((jobApp) => {
      return jobApp.get('jobPost.company.id') === this.selectedCompany.id;
    });
  }

  @action statusFilter(status) {
    this.selectedStatus = status;
    const jobApplications = this.store.peekAll('job-application');
    this.statusSelectFilter = jobApplications.filter((jobApp) => {
      return jobApp.status === status;
    });
  }
  @action selectInput(text, select, event){
    console.log(text)
    console.log(select.results)
    console.log(event)
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
