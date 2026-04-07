import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class JobPostsNewController extends Controller {
  @service store;
  @service flashMessages;
  @service router;

  @tracked selectedCompany = null;

  @action
  async searchCompanies(term) {
    const params = term ? { 'filter[query]': term } : {};
    const results = await this.store.query('company', params);
    return results.slice();
  }

  @action
  updateField(field, event) {
    this.model[field] = event.target.value;
  }

  @action updateCompany(company) {
    this.model.company = company;
    this.selectedCompany = company;
  }

  @action submitDelete() {
    this.model
      .destroyRecord()
      .then(() => this.flashMessages.success('successfully deleted record'));
  }

  @action addCompanyToJobPost(companyName) {
    const company = this.store.createRecord('company', { name: companyName });
    company
      .save()
      .then((this.selectedCompany = company))
      .then((this.model.company = company))
      .then(this.flashMessages.success('created company ' + company.name));
  }

  @action submitJobPost(event) {
    event.preventDefault();
    this.model.save().then((record) => {
      this.flashMessages.success('Job post saved');
      this.router.transitionTo('job-posts.show', record);
    });
  }
  @action createAndApply(event) {
    event.preventDefault();
    this.model
      .save()
      .then((record) =>
        this.router.transitionTo('job-posts.show.job-applications.new', record),
      );
  }
  @action createAndScore(event) {
    event.preventDefault();
    this.model
      .save()
      .then((record) =>
        this.router.transitionTo('job-posts.show.scores', record),
      );
  }
}
