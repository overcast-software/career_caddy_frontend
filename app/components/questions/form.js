import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
export default class QuestionsFormComponent extends Component {
  @tracked errorMessage = null;
  @tracked selectedCompany = null;
  @tracked selectedJobApplication = null;
  @service store;
  @service flashMessages
  @service router;

  get jobApplications() {
    return this.selectedCompany
      ? this.selectedCompany.jobApplications.content
      : this.store.peekAll('job-application');
  }

  get companies() {
    return this.store.peekAll('company');
  }

  @action updateContent(event) {
    this.args.question.content = event.target.value;
  }

  @action updateCompany(company) {
    this.selectedCompany = company;
  }

  @action updateJobApplication(jobApplication) {
    this.selectedJobApplication = jobApplication;
    this.args.question.jobApplication = jobApplication;
  }

  @action async save(event) {
    event?.preventDefault();
    this.args.question.jobApplication = this.selectedJobApplication;
    this.args.question.company = this.selectedCompany;
    this.args.question
      .save()
      .then((q) => this.router.transitionTo('questions.show', q.id));
  }
  @action saveAndNew() {
    this.args.question.company = this.selectedCompany;
    this.args.question.save()
        .then( () => {this.flashMessages.succes("success")} )
        .then(() => {
      this.router.transitionTo('questions.new', {
        queryParams: { companyId: this.selectedCompany.id },
      });
    })
  }

  @action cancel(event) {
    event?.preventDefault();
    this.args.question.rollbackAttributes?.();
  }
}
