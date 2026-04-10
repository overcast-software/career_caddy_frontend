import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class AnswersIndexController extends Controller {
  queryParams = ['search'];

  @service flashMessages;
  @service router;
  @service store;
  @tracked search = '';
  @tracked isSearching = false;

  @action updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }
  @action startSearching() {
    this.isSearching = true;
  }

  @action newAnswer() {
    this.flashMessages.info('Select a question to answer.');
    this.router.transitionTo('questions');
  }

  @action async toggleFavorite(answer) {
    answer.favorite = !answer.favorite;
    try {
      await answer.save();
      this.store.peekRecord('career-data', '1')?.markDirty();
      const status = answer.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Answer ${status} favorites`);
    } catch {
      answer.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status');
    }
  }
}
