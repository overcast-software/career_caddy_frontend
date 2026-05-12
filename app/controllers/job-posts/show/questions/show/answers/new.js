import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowQuestionsShowAnswersNewController extends Controller {
  @service router;

  @action onSave() {
    this.router.transitionTo(
      'job-posts.show.questions.show.answers',
      this.model.jobPost.id,
      this.model.question.id,
    );
  }
}
