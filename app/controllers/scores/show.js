import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ScoresShowController extends Controller {
  @service flashMessages;
  @service router;

  @action deleteScore() {
    if (!confirm('Delete this score?')) return;
    this.model
      .destroyRecord()
      .then(() => {
        this.model.unloadRecord();
        this.flashMessages.success('Score deleted.');
        this.router.transitionTo('job-posts');
      })
      .catch(() => {
        this.flashMessages.danger('Failed to delete score.');
      });
  }
}
