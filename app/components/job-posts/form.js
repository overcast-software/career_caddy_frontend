import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
// import { A } from '@ember/array';

export default class JobPostsFormComponent extends Component {
  @service router;
  @service store;
  @service flashMessages;
  @tracked errorMessage = null;
  @tracked form_toggle = false; // false = "by url", true = "manual"
  @tracked selectedCompanyId = '__new__';
  @tracked useNewCompany = true;
  @tracked newCompanyName = '';

  constructor() {
    super(...arguments);
    const company = this.args.jobPost?.company;
    if (company) {
      this.useNewCompany = false;
      this.selectedCompanyId = company.id;
    } else {
      this.useNewCompany = true;
      this.selectedCompanyId = '__new__';
    }
  }

  get companies() {
    return this.store.peekAll('company');
  }

  @action
  onModeChange(event) {
    this.form_toggle = event.target.value === 'manual';
  }

  @action
  handleCompanyChoice(event) {
    const value = event.target.value;
    if (value === '__new__') {
      this.useNewCompany = true;
      this.selectedCompanyId = '__new__';
    } else {
      this.useNewCompany = false;
      this.selectedCompanyId = value;
    }
  }

  @action
  updateNewCompanyName(event) {
    this.newCompanyName = event.target.value;
  }

  @action
  updateField(field, event) {
    this.args.jobPost[field] = event.target.value;
  }
  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  @action
  async submitEdit(event) {
    event.preventDefault();
    this.errorMessage = null;

    try {
      if (this.useNewCompany) {
        const name = (this.newCompanyName || '').trim();
        if (!name) {
          this.flashMessages.danger('Please enter a company name.');
          return;
        }
        const company = await this.store
          .createRecord('company', { name })
          .save();
        this.args.jobPost.company = company;
      } else if (this.selectedCompanyId) {
        const company = this.store.peekRecord('company', this.selectedCompanyId);
        if (!company) {
          this.flashMessages.danger('Please select a company.');
          return;
        }
        this.args.jobPost.company = company;
      } else {
        this.flashMessages.danger('Please select a company.');
        return;
      }

      await this.args.jobPost.save();
      this.flashMessages.add({ message: 'Saved the job post' });
      this.router.transitionTo('job-posts.index');
    } catch (e) {
      this.flashMessages.danger('Problem in saving job post.');
    }
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
