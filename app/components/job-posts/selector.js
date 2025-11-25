import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
export default class JobPostsSelector extends Component {
  @service store;
  @tracked selectedJobPost;
  @tracked postsByCompany = [];

  constructor() {
    super(...arguments);
    this.groupedSelect;
  }

  get groupedSelect() {
    //not working
    const stuff = []
    this.store.findAll('company').then((companies) => {
      companies.forEach((company) => {

        let group = {
          groupName: company.name,
          options: company.jobPosts.content.map((p)=> p),
        };

        if ( !stuff.includes(group) && company.jobPosts.length > 0){
          stuff.push(group)
        }
      })
    })
        .then(()=> { this.postsByCompany = stuff })
  }

  @action updateJobPost(jobPost) {
    if (this.args.jobPostCallback) {
      this.args.jobPostCallback(jobPost);
    }
    this.selectedJobPost = jobPost;
  }
}
