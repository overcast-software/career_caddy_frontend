import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
// import { A } from '@ember/array';
import ArrayProxy from '@ember/array/proxy';

export default class JobPostsFormComponent extends Component {
  @service router;
  @service store;
  @tracked errorMessage = null;
  @tracked form_toggle = false; // false = "by url", true = "manual"
  @tracked companyQuery = '';
  @service flashMessages;

  get companies() {
    return this.store.peekAll('company');
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

  @action
  async submitEdit(event) {
    event.preventDefault();
    this.errorMessage = null;
    const companyName = event.target.elements['company'].value;
    let company = this.companies.find((company) => company.name == companyName);
    if (!company) {
      company = await this.store
        .createRecord('company', { name: companyName })
        .save();
      this.args.jobPost.company = company;
      this.args.jobPost.save();
    } else {
      this.args.jobPost.company = company;
      this.args.jobPost
        .save()
        .then(() => this.flashMessages.add({ message: 'Saved the job post' }))
        .then(() => this.router.transitionTo('job-posts.index'))
        .catch(() => this.flashMessages.danger('Problem in saving job post.'));
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
