import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowQuestionsShowController extends Controller {
  @service router;
  @service flashMessages;
  @service store;

  get showAnswersList() {
    const route = this.router.currentRouteName;
    return (
      route === 'job-posts.show.questions.show' ||
      route === 'job-posts.show.questions.show.index'
    );
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
