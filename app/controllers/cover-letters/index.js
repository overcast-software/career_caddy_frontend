import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class CoverLettersIndexController extends Controller {
  @service flashMessages;
  @service store;

  @action async toggleFavorite(coverLetter) {
    coverLetter.favorite = !coverLetter.favorite;
    try {
      await coverLetter.save();
      this.store.peekRecord('career-data', '1')?.markDirty();
      const status = coverLetter.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Cover letter ${status} favorites`);
    } catch {
      coverLetter.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status');
    }
  }

  get coverLetters() {
    return this.model.coverLetters;
  }
  get jobPosts() {
    return this.model.jobPosts;
  }
}
