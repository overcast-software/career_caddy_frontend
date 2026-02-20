import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class FavoritesController extends Controller {
  @service flashMessages;
  
  @tracked showOnlyFavorites = true;
  @tracked activeTab = 'resumes';

  get filteredResumes() {
    const resumes = this.model.resumes || [];
    return this.showOnlyFavorites
      ? resumes.filter((r) => r.favorite)
      : resumes;
  }

  get filteredCoverLetters() {
    const coverLetters = this.model.coverLetters || [];
    return this.showOnlyFavorites
      ? coverLetters.filter((cl) => cl.favorite)
      : coverLetters;
  }

  get filteredAnswers() {
    const answers = this.model.answers || [];
    return this.showOnlyFavorites
      ? answers.filter((a) => a.favorite)
      : answers;
  }

  @action
  toggleFilterMode() {
    this.showOnlyFavorites = !this.showOnlyFavorites;
  }

  @action
  setActiveTab(tab) {
    this.activeTab = tab;
  }

  @action
  async toggleFavorite(item) {
    item.favorite = !item.favorite;
    try {
      await item.save();
      const status = item.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Item ${status} favorites`);
    } catch (error) {
      item.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status');
    }
  }
}
