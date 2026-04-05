import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class CoverLettersEditController extends Controller {
  @service flashMessages;
  @service router;

  @action async deleteCoverLetter() {
    if (!confirm('Delete this cover letter?')) return;
    await this.model.destroyRecord();
    this.flashMessages.success('Cover letter deleted.');
    this.router.transitionTo('cover-letters.index');
  }
}
