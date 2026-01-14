import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ResumesIndexController extends Controller {
  @service flashMessages;

  @action async toggleFavorite(resume) {
    resume.favorite = !resume.favorite;
    try {
      await resume.save();
      const status = resume.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Resume ${status} favorites`);
    } catch (error) {
      resume.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status');
    }
  }

  get resumeCount() {
    return this.model.length;
  }

  get noResumes() {
    return this.resumeCount === 0;
  }
}
