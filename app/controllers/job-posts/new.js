import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class JobPostsNewController extends Controller {
  @service store;
  @service flashMessages;
  @service router;

  @tracked selectedCompany = null;
  get companies() {
    return this.store.findAll('company');
  }
  @action
  updateField(field, event) {
    this.model[field] = event.target.value;
  }

  @action submitDelete() {
    this.model
      .destroyRecord()
      .then(() => this.flashMessages.success('successfully deleted record'));
  }

  @action addCompanyToJobPost(companyName) {
    const company = this.store.createRecord("company", {name: companyName})
    company.save()
           .then(this.selectedCompany = company)
           .then(this.model.company = company)
           .then(this.flashMessages.success('created company ' + company.name))
  }

  @action submitJobPost(event) {
    event.preventDefault();
    this.model
      .save()
      .then(this.flashMessages.success('Job post saved'))
      .then(this.router.transitionTo('job-posts.show', this.model));
  }
  @action createAndApply(event) {
    event.preventDefault();
    this.model
      .save()
      .then((record) =>
        this.router.transitionTo('job-posts.show.job-applications.new', record),
      );
  }
}
