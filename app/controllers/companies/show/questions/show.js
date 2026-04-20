import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class CompaniesShowQuestionsShowController extends Controller {
  @service router;
  @service flashMessages;
  @service store;

  get showAnswersList() {
    const route = this.router.currentRouteName;
    return (
      route === 'companies.show.questions.show' ||
      route === 'companies.show.questions.show.index'
    );
  }

  // Toggle the answer's favorite state and persist immediately with
  // rollback on failure — same pattern as <Answers::Form> so a click
  // "just works" without needing a subsequent save.
  @action async toggleAnswerFavorite(answer) {
    const previous = answer.favorite;
    answer.favorite = !previous;
    try {
      await answer.save();
    } catch (error) {
      answer.favorite = previous;
      this.flashMessages.danger(
        error?.errors?.[0]?.detail ?? 'Failed to update favorite.',
      );
    }
  }

  @action deleteAnswer(answer) {
    if (!window.confirm('Delete this answer?')) return;
    answer
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Answer deleted.');
        this.store.findRecord('question', this.model.id, {
          include: 'answers',
          reload: true,
        });
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete answer.');
        }
      });
  }
}
