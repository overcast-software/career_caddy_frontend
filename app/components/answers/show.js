import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class AnswersShowComponent extends Component {
  @service router;
  @service flashMessages;

  @action deleteAnswer() {
    if (!confirm('Delete this answer?')) return;
    const answer = this.args.answer;
    answer
      .destroyRecord()
      .then(() => {
        answer.unloadRecord();
        this.flashMessages.success('Answer deleted.');
        if (this.args.onDelete) {
          this.args.onDelete();
        }
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete answer.');
        }
      });
  }
}
