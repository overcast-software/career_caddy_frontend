import Controller from '@ember/controller';
import { inject as controller } from '@ember/controller';
export default class JobPostsShowJobApplicationsNewController extends Controller {
  @controller('job-posts.show') parent;
  get jobPostResume(){
    return this.parent.resume
  }
  get resumeSetter(){
    return this.parent.resumeSetter
  }
  // litterally nothing to go in here
  //
}
