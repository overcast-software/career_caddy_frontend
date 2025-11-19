import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class ResumesIndexController extends Controller {
  @service flashMessages;

  get resumeCount() {
    return this.model.length;
  }

  get noResumes() {
    return this.resumeCount === 0;
  }
}
