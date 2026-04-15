import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class CoverLettersEditController extends Controller {
  @service flashMessages;
  @service router;

  @action deleteCoverLetter() {
    if (!confirm('Delete this cover letter?')) return;
    this.model
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Cover letter deleted.');
        this.router.transitionTo('cover-letters.index');
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete cover letter.');
        }
      });
  }
}
