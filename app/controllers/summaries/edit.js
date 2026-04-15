import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class SummariesEditController extends Controller {
  @service flashMessages;
  @service router;
  @service store;

  get resumeOptions() {
    return this.store.peekAll('resume');
  }

  @action updateContent(event) {
    this.model.content = event.target.value;
  }

  @action updateResume(resume) {
    this.model.resume = resume
      ? this.store.peekRecord('resume', resume.id)
      : null;
  }

  @action toggleActive() {
    this.model.active = !this.model.active;
  }

  @action saveSummary(event) {
    event.preventDefault();
    this.model.save().then(() => {
      this.flashMessages.success('Summary saved');
      this.router.transitionTo('summaries.show', this.model.id);
    });
  }

  @action deleteSummary() {
    if (!confirm('Are you sure you want to delete this summary?')) return;
    this.model
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Summary deleted.');
        this.router.transitionTo('summaries.index');
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete summary.');
        }
      });
  }
}
