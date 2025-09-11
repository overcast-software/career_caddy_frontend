import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsFormComponent extends Component {
  @service router;
  @tracked errorMessage = null;
  @tracked form_toggle = false; // false = "by url", true = "manual"

  @action
  onModeChange(event) {
    this.form_toggle = event.target.value === 'manual';
  }


  @action
  updateField(field, event) {
    this.args.jobPost[field] = event.target.value;
  }

  @action
  async onSubmit(event) {
    event.preventDefault();
    this.errorMessage = null;

    try {
      await this.args.jobPost.save();
      this.router.transitionTo('job-posts.show', this.args.jobPost.id);
    } catch (e) {
      this.errorMessage = e?.errors?.[0]?.detail || e?.message || 'Failed to create job post';
    }
  }
}
