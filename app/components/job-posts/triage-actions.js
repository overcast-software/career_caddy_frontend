import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class JobPostsTriageActionsComponent extends Component {
  @service store;
  @service flashMessages;
  @tracked submitting = false;

  get activeStatus() {
    return this.args.jobPost?.activeApplicationStatus;
  }

  get isVettedGood() {
    return this.activeStatus === 'Vetted Good';
  }

  get isVettedBad() {
    return this.activeStatus === 'Vetted Bad';
  }

  @action
  vet(status) {
    if (this.submitting) return;
    const adapter = this.store.adapterFor('job-post');
    const id = this.args.jobPost.id;
    const url = adapter.buildURL('job-post', id) + 'triage/';
    this.submitting = true;
    adapter
      .ajax(url, 'POST', { data: { status } })
      .then((payload) => {
        this.store.pushPayload('job-post', payload);
        this.flashMessages.success(`Marked ${status}.`);
      })
      .catch((error) => {
        const detail = error?.errors?.[0]?.detail ?? 'Triage failed.';
        this.flashMessages.danger(detail);
      })
      .finally(() => {
        this.submitting = false;
      });
  }

  @action
  vetGood() {
    this.vet('Vetted Good');
  }

  @action
  vetBad() {
    this.vet('Vetted Bad');
  }
}
