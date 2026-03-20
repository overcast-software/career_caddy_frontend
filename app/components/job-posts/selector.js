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
    this._loadGroupedData();
  }

  async _loadGroupedData() {
    const stuff = [];
    let companies;
    try {
      companies = await this.store.findAll('company');
    } catch {
      return;
    }
    companies.forEach((company) => {
      let group = {
        groupName: company.name,
        options: company.jobPosts.content.map((p) => p),
      };
      if (!stuff.includes(group) && company.jobPosts.length > 0) {
        stuff.push(group);
      }
    });
    this.postsByCompany = stuff;
  }

  @action updateJobPost(jobPost) {
    if (this.args.jobPostCallback) {
      this.args.jobPostCallback(jobPost);
    }
    this.selectedJobPost = jobPost;
  }
}
