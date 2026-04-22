import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsNewIndexRoute extends Route {
  @service router;

  beforeModel() {
    this.router.replaceWith('job-posts.new.paste');
  }
}
