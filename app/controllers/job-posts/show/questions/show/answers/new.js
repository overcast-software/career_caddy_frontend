import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowQuestionsShowAnswersNewController extends Controller {
  @service router;
  @service store;

  @action onSave() {
    this.store.findRecord('question', this.model.question.id, {
      include: 'answers',
      reload: true,
    });
    this.router.transitionTo(
      'job-posts.show.questions.show',
      this.model.jobPost,
      this.model.question,
    );
  }
}
