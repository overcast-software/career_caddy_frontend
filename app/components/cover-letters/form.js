import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class CoverLettersForm extends Component {
  @service flashMessages;
  @service router;
  @service store;
  @action updateContent(event) {
    this.args.coverLetter.content = event.target.value;
  }
  @action async saveCoverLetter(event) {
    event.preventDefault();
    try {
      await this.args.coverLetter.save();
      this.store.peekRecord('career-data', '1')?.markDirty();
      this.flashMessages.success('Cover letter saved.');
      this.router.transitionTo(
        'cover-letters.show',
        this.args.coverLetter.id,
      );
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to save cover letter.');
      }
    }
  }
  @action async toggleFavorite(coverLetter) {
    coverLetter.favorite = !coverLetter.favorite;
  }
}
