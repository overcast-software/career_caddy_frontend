import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class SummariesEditController extends Controller {
  @service flashMessages;
  @service router;

  @action updateContent(event) {
    this.model.content = event.target.value;
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
    const allowed = confirm('Are you sure you want to delete this summary?');
    if (!allowed) return;
    this.model.destroyRecord().then(() => {
      this.flashMessages.success('Summary deleted');
      this.router.transitionTo('summaries.index');
    });
  }
}
