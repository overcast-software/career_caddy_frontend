import Controller from '@ember/controller';
export default class ResumesIndexController extends Controller {
  get resumeCount() {
    return this.model.length;
  }

  get noResumes() {
    return this.resumeCount === 0;
  }
}
