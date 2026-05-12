import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsShowController extends Controller {
  @service router;

  get showAnswersList() {
    const route = this.router.currentRouteName;
    return (
      route === 'job-posts.show.questions.show' ||
      route === 'job-posts.show.questions.show.index' ||
      route === 'job-posts.show.questions.show.answers' ||
      route === 'job-posts.show.questions.show.answers.index'
    );
  }

  // Drop the answer from the question's hasMany after a successful
  // delete in <Answers::Show>. Ember Data 5's auto-cleanup throws on
  // the destroy path (see feedback_no_unload_after_destroy memory),
  // so explicit splicing is the reliable move.
  @action removeAnswer(answer) {
    this.model.hasMany('answers').value()?.removeObject(answer);
  }
}
