import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class AnswersIndexController extends Controller {
  @service flashMessages;

  @action async toggleFavorite(answer) {
    answer.favorite = !answer.favorite;
    try {
      await answer.save();
      const status = answer.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Answer ${status} favorites`);
    } catch (error) {
      answer.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status');
    }
  }
}
