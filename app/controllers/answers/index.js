import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class AnswersIndexController extends Controller {
  queryParams = ['search'];

  @service flashMessages;
  @service router;
  @tracked search = '';
  @tracked isSearching = false;

  #debounceTimer = null;

  @action
  onSearchInput(event) {
    const value = event.target.value;
    this.isSearching = true;
    clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      this.search = value;
    }, 300);
  }

  @action newAnswer() {
    this.flashMessages.info('Select a question to answer.');
    this.router.transitionTo('questions');
  }

  @action async toggleFavorite(answer) {
    answer.favorite = !answer.favorite;
    try {
      await answer.save();
      const status = answer.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Answer ${status} favorites`);
    } catch {
      answer.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status');
    }
  }
}
