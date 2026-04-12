import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsFormComponent extends Component {
  @service store;
  @service flashMessages;
  @service router;
  @tracked _selectedCompany = null;

  get selectedCompany() {
    return this._selectedCompany ?? this.args.jobPost?.company;
  }

  @action
  updateCompany(company) {
    this._selectedCompany = company;
    this.args.jobPost.company = company;
  }

  @action
  async searchCompanies(term) {
    const params = term ? { 'filter[query]': term } : {};
    const results = await this.store.query('company', params);
    return results.slice();
  }

  @action
  updateField(field, event) {
    this.args.jobPost[field] = event.target.value;
  }

  @action
  addCompanyToJobPost(companyName) {
    const company = this.store.createRecord('company', { name: companyName });
    this._selectedCompany = company;
    this.args.jobPost.company = company;
    company
      .save()
      .then(() => this.flashMessages.success('Created company ' + company.name))
      .catch(() => this.flashMessages.danger('Failed to create company'));
  }

  @action
  async submitEdit(event) {
    event.preventDefault();
    try {
      await this.args.jobPost.save();
      this.flashMessages.success('Job post saved.');
      this.router.transitionTo('job-posts.show', this.args.jobPost);
    } catch (error) {
      this.flashMessages.danger(error?.errors?.[0]?.detail ?? 'Failed to save job post.');
    }
  }

  @action
  cancel(event) {
    event?.preventDefault?.();
    this.router.transitionTo('job-posts.show', this.args.jobPost);
  }

  @action
  async submitDelete(event) {
    event.preventDefault();
    try {
      await this.args.jobPost.destroyRecord();
      this.flashMessages.success('Job post deleted.');
      this.router.transitionTo('job-posts.index');
    } catch {
      this.flashMessages.danger('Failed to delete job post.');
    }
  }
}
