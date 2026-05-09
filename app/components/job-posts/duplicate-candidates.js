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

  fetchCandidates() {
    const jp = this.args.jobPost;
    if (!jp || !jp.id) return;
    this.store
      .query('job-post-duplicate-candidate', { jobPostId: jp.id })
      .then((results) => {
        this.candidates = results.map((row) => ({
          id: row.id,
          title: row.title || '(untitled)',
          companyName: row.companyName,
          confidence: row.confidence,
          signals: (row.matchSignals || []).map((s) => SIGNAL_LABELS[s] || s),
        }));
        this.loaded = true;
      })
      .catch(() => {
        this.loaded = true;
      });
  }
}
