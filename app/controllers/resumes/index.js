import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class ResumesIndexController extends Controller {
  @service store;
  @service flashMessages;
  @service spinner;

  get noResumes() {
    return !this.model?.length;
  }

  @action deleteResume(resume) {
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    this.spinner
      .wrap(resume.destroyRecord())
      .then(() => {
        this.flashMessages.success('Resume deleted.');
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete resume.');
        }
      });
  }

  @action async toggleFavorite(resume) {
    resume.favorite = !resume.favorite;
    try {
      await resume.save();
      this.store.peekRecord('career-data', '1')?.markDirty();
      const status = resume.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Resume ${status} favorites.`);
    } catch {
      resume.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status.');
    }
  }
}
