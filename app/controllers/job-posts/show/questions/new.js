import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowQuestionsNewController extends Controller {
  @service router;

  @action onSave() {
    const { job_post_id } = this.router.currentRoute.parent.parent.params;
    this.router.transitionTo('job-posts.show.questions', job_post_id);
  }
}
