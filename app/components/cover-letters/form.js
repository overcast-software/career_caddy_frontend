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
  @action saveCoverLetter(event) {
    event.preventDefault();
    this.args.coverLetter
      .save()
      .then(() => {
        this.store.peekRecord('career-data', '1')?.markDirty();
        this.flashMessages.success('Cover letter saved.');
      })
      .then(() =>
        this.router.transitionTo(
          'cover-letters.show',
          this.args.coverLetter.id,
        ),
      );
  }
  @action async toggleFavorite(coverLetter) {
    coverLetter.favorite = !coverLetter.favorite;
  }
}
