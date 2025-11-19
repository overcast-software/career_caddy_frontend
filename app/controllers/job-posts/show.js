import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowController extends Controller {
  @service store;
  @tracked data = null;
  @tracked loading = true;
  @tracked error = null;
  @tracked application = null;
  @tracked resumes = null;
  @tracked users = null;
  @tracked coverLetters = null;
  @service flashMessages;
  showControls = true;
}
