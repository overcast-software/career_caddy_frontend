import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class JobPostsSelector extends Component {
  @service store;
  @tracked selectedJobPost = null;
  @tracked postByCompany = [];

  constructor() {
    super(...arguments);
    this._loadGroupedData();
  }

  async _loadGroupedData() {
    let companies;
    try {
      companies = await this.store.findAll('company', { include: 'job-posts' });
    } catch {
      return;
    }
    const groups = [];
    for (const company of companies) {
      const posts = (await company.jobPosts).slice();
      if (posts.length > 0) {
        groups.push({ groupName: company.name, options: posts });
      }
    }
    this.postByCompany = groups;
  }

  #lastTerm = null;
  #lastResults = null;

  searchJobPosts = async (term) => {
    if (!term || term.length < 2) return this.postByCompany;
    if (term === this.#lastTerm) return this.#lastResults;
    const results = await this.store.query('job-post', {
      'filter[query]': term,
      include: 'company',
      'page[size]': 20,
    });
    const grouped = new Map();
    results.forEach((post) => {
      const name = post.company?.get('name') ?? 'Unknown';
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(post);
    });
    this.#lastTerm = term;
    this.#lastResults = Array.from(grouped, ([groupName, options]) => ({ groupName, options }));
    return this.#lastResults;
  };

  @action updateJobPost(jobPost) {
    this.args.jobPostCallback?.(jobPost);
    this.selectedJobPost = jobPost;
  }
}
