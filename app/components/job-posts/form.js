import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsFormComponent extends Component {
  @service router;
  @service store;
  @tracked errorMessage = null;
  @tracked form_toggle = false; // false = "by url", true = "manual"
  @tracked companyQuery = '';

  constructor(...args) {
    super(...args);
    // Preload companies so the dropdown has options
    // this.store.findAll('company');
  }

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
    this.args.jobPost.save();
  }
}
