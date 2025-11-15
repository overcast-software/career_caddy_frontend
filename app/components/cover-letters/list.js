import Component from '@glimmer/component';
import { service } from '@ember/service';
export default class CoverLettersList extends Component {
  @service store;
  get jobPosts() {
    return this.store.peekAll('job-post');
  }
  myJobPost(coverLetter) {
    return coverLetter.jobApplication;
    // coverLetter.belongsTo("job-post").load()
    //            .then( () => coverLetter.belongsTo("job-post").value())
    // return this.jobPosts.find((jp)=> jp.coverLetters.any( (cl) => cl === coverLetter))
  }
}
