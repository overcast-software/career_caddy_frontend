import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ScoresIndexController extends Controller {
  @service flashMessages;

  @action async deleteScore(score) {
    try {
      await score.destroyRecord();
      this.model.content.removeObject(score);
      this.flashMessages.success('Score deleted.');
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to delete score.');
      }
    }
  }
}
