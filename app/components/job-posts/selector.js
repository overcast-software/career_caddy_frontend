import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

/**
 * Searchable job-post picker, shared by cover-letters/new,
 * job-applications/new and questions/form.
 *
 * Optional args (all default to the original behaviour, so callers that
 * pass neither are unaffected):
 *
 *   @companyId   narrow every request to one company via
 *                filter[company_id] — the browse list and the search
 *   @selected    take control of the selection; omit it and the
 *                component keeps its own local selection as before
 *   @allowClear  forwarded to PowerSelect
 *   @placeholder overrides the default prompt
 */
export default class JobPostsSelector extends Component {
  @service store;
  @tracked selectedJobPost = null;
  @tracked postByCompany = [];

  // Which company the browse list was last filled for, so reopening the
  // dropdown doesn't refetch but switching company does. `undefined`
  // means "never loaded" — distinct from `null` ("loaded, unscoped").
  #defaultsScope = undefined;
  #lastSearchKey = null;
  #lastSearchResults = null;

  get companyId() {
    return this.args.companyId ?? null;
  }

  // Controlled vs uncontrolled selection. A caller that passes
  // @selected owns the value — a chosen JobApplication back-filling its
  // JobPost has to visibly move this field. `undefined` means the arg
  // wasn't passed at all; an explicit `null` still means "nothing".
  get selected() {
    return this.args.selected === undefined
      ? this.selectedJobPost
      : this.args.selected;
  }

  get placeholder() {
    return this.args.placeholder ?? 'Search job posts by title or company…';
  }

  /**
   * The list shown before anything is typed. This used to run in the
   * constructor — a findAll of every company plus their job posts, on
   * every mount of every page hosting the component. Nobody needs it
   * until the dropdown is actually open, so PowerSelect's @onOpen asks
   * for it instead.
   */
  @action
  async loadDefaultOptions() {
    const scope = this.companyId;
    if (this.#defaultsScope === scope) return this.postByCompany;
    this.#defaultsScope = scope;
    // Drop the previous company's posts immediately — showing them
    // under a new company while the request is in flight is a lie.
    this.postByCompany = [];
    this.postByCompany = scope
      ? this.#groupPosts(await this.#queryPosts(null))
      : await this.#browseAllCompanies();
    return this.postByCompany;
  }

  searchJobPosts = async (term) => {
    if (!term || term.length < 2) return this.loadDefaultOptions();
    // The memo is keyed by company as well as term: the same word under
    // a different company must not replay the other company's results.
    const key = `${this.companyId ?? ''}::${term}`;
    if (key === this.#lastSearchKey) return this.#lastSearchResults;
    const results = await this.#queryPosts(term);
    this.#lastSearchKey = key;
    this.#lastSearchResults = this.#groupPosts(results);
    return this.#lastSearchResults;
  };

  @action updateJobPost(jobPost) {
    this.args.jobPostCallback?.(jobPost);
    this.selectedJobPost = jobPost;
  }

  async #queryPosts(term) {
    const params = { include: 'company', 'page[size]': 20 };
    if (term) params['filter[query]'] = term;
    if (this.companyId) params['filter[company_id]'] = this.companyId;
    return this.store.query('job-post', params);
  }

  #groupPosts(results) {
    const grouped = new Map();
    for (const post of results) {
      const name = post.company?.get('name') ?? 'Unknown';
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(post);
    }
    return Array.from(grouped, ([groupName, options]) => ({
      groupName,
      options,
    }));
  }

  async #browseAllCompanies() {
    let companies;
    try {
      // A rejection here (403 on a guest session) should cost the user
      // the browse list, not the whole picker — the search path below
      // still works without it.
      companies = await this.store.findAll('company', { include: 'job-posts' });
    } catch {
      return [];
    }
    const groups = [];
    for (const company of companies) {
      // The live ManyArray goes straight into `options` — no .slice(),
      // which would detach it from Ember Data's tracking.
      const posts = await company.jobPosts;
      if (posts.length > 0) {
        groups.push({ groupName: company.name, options: posts });
      }
    }
    return groups;
  }
}
