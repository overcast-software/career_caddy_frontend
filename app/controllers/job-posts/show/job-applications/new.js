import Controller from '@ember/controller';
export default class JobPostsShowJobApplicationsNewController extends Controller {
  get jobApplication() {
    return this.model.jobApplication;
  }

  get resumes() {
    return this.model.resumes;
  }
}
