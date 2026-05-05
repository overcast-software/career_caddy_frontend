import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

const SIGNAL_LABELS = {
  canonical_link: 'same URL',
  fingerprint: 'same company + title',
  title_similarity: 'title overlap',
};

export default class JobPostsDuplicateCandidatesComponent extends Component {
  @service store;

  @tracked candidates = [];
  @tracked loaded = false;

  constructor(owner, args) {
    super(owner, args);
    this.fetchCandidates();
  }

  // Note: navigating jp.show → jp.show with a different id reuses this
  // component instance (same template invocation), so the constructor
  // doesn't re-fire and the banner shows stale candidates from the
  // previous jp until next route entry. Acceptable for a first cut.
  // Follow-up: install @ember/render-modifiers and add
  // {{did-update this.fetchCandidates @jobPost.id}} in the template.

  fetchCandidates() {
    const jp = this.args.jobPost;
    if (!jp || !jp.id) return;
    const adapter = this.store.adapterFor('job-post');
    const url = adapter.buildURL('job-post', jp.id) + 'duplicate-candidates/';
    adapter
      .ajax(url, 'GET')
      .then((payload) => {
        this.candidates = (payload?.data || []).map((row) => ({
          id: row.id,
          title: row.attributes?.title || '(untitled)',
          companyName: row.attributes?.company_name,
          confidence: row.attributes?.confidence,
          signals: (row.attributes?.match_signals || []).map(
            (s) => SIGNAL_LABELS[s] || s,
          ),
        }));
        this.loaded = true;
      })
      .catch(() => {
        // Silent — banner just stays hidden.
        this.loaded = true;
      });
  }
}
