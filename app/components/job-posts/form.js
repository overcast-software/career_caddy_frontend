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
  @tracked selectedCompany = null;
  @tracked useNewCompany = true;
  @tracked newCompanyName = '';

  constructor() {
    super(...arguments);
    this.args.jobPost.company.then((company) => {
      if (company) {
        this.useNewCompany = false;
        this.selectedCompany = company;
      }
    });
  }

  get companies() {
    return this.store.peekAll('company');
  }

  @action
  onModeChange(event) {
    this.form_toggle = event.target.value === 'manual';
  }

  @action
  handleCompanyChoice(company) {
    this.selectedCompany = company;
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
    this.args.jobPost.save()
        .catch((error)=>this.flashMessages.alert(error))
        .then(()=> this.router.transitionTo('job-posts.show', this.args.jobPost))
        .then(()=> this.flashMessages.success('successfully saved job post'))

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
