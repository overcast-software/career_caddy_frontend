import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowController extends Controller {
  @service store;
  @service flashMessages;
  showControls = true;
}
