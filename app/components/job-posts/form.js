import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
export default class JobPostsFormComponent extends Component {
  @service router;
  @service store;
  @service flashMessages;
  @tracked form_toggle = false; // false = "by url", true = "manual"
  @tracked newCompanyName = '';
  @tracked _selectedCompany = null;

  get selectedCompany() {
    return this._selectedCompany ?? this.args.jobPost?.company;
  }

  @action updateCompany(company) {
    this._selectedCompany = company;
    this.args.jobPost.company = company;
  }

  get companies() {
    return this.args.companies || this.store.peekAll('company');
  }

  @action
  onModeChange(event) {
    this.form_toggle = event.target.value === 'manual';
  }

  @action
  updateField(field, event) {
    this.args.jobPost[field] = event.target.value;
  }
  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  @action addCompanyToJobPost(companyName) {
    const company = this.store.createRecord('company', { name: companyName });
    this._selectedCompany = company;
    this.args.jobPost.company = company;
    company
      .save()
      .then(() => this.flashMessages.success('created company ' + company.name))
      .catch(() => this.flashMessages.danger('Failed to create company'));
  }

  @action
  async submitEdit(event) {
    event.preventDefault();
    this.args.jobPost
      .save()
      .catch((error) => this.flashMessages.alert(error))
      .then(() => this.router.transitionTo('job-posts.show', this.args.jobPost))
      .then(() => this.flashMessages.success('successfully saved job post'));
  }
  @action
  cancel(event) {
    event?.preventDefault?.();
    this.router.transitionTo('job-posts.show', this.args.jobPost);
  }

  @action
  async submitDelete(event) {
    event.preventDefault();
    this.args.jobPost
      .destroyRecord()
      .then(() => this.router.transitionTo('job-posts.index'))
      .then(() => this.flashMessages.success('Saved the job post'))
      .catch(() => this.flashMessages.danger('Problem in saving job post.'));
  }
}
