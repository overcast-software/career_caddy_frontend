import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsShowController extends Controller {
  @service router;

  get showAnswersList() {
    const route = this.router.currentRouteName;
    return (
      route === 'job-posts.show.questions.show' ||
      route === 'job-posts.show.questions.show.index'
    );
  }
}
