import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

const SIGNAL_LABELS = {
  canonical_link: 'same URL',
  fingerprint: 'same company + title',
  title_similarity: 'title overlap',
  apply_hint: 'apply-button link',
  referrer_hint: 'referrer link',
};

// Pure renderer for the possible-duplicate banner shown above
// jp.show's description. The candidate list is the resolved
// `duplicateCandidates` async hasMany on the JobPost model — the
// jp.show route's model() awaits .reload() on every activation so
// clicking a candidate's LinkTo to navigate re-runs the query as
// part of the new model resolution. No fetch lives in this
// component (constructors / side-effect getters don't react to arg
// changes, which was the jp 1532 reproducer on 2026-05-13).
export default class JobPostsDuplicateCandidatesComponent extends Component {
  @service currentUser;
  @service flashMessages;

  @tracked resolving = false;

  get rows() {
    const out = [];
    // Async hasMany — iterate directly. Avoid .slice / .toArray /
    // .objectAt per the project's Ember Data convention.
    for (const row of this.args.candidates || []) {
      if (!row) continue;
      out.push({
        id: row.id,
        title: row.title || '(untitled)',
        companyName: row.companyName,
        confidence: row.confidence,
        signals: (row.matchSignals || []).map((s) => SIGNAL_LABELS[s] || s),
      });
    }
    return out;
  }

  get isStaff() {
    return this.currentUser.user?.isStaff;
  }

  // Staff-only manual trigger: POST /job-posts/:id/resolve-and-dedupe/
  // creates a Scrape(skip_extract=True, status=hold) which the
  // hold-poller picks up. The scrape-graph follows redirects and
  // attaches via DuplicateShortCircuit on canonical-link match —
  // catches tracker-URL stubs that the synchronous from-text path
  // missed.
  @action
  resolveAndDedupe() {
    if (!this.args.jobPost) return;
    this.resolving = true;
    this.args.jobPost
      .resolveAndDedupe()
      .then(() => {
        this.flashMessages.success(
          'Resolve-and-dedupe queued. Refresh in ~30s to see new candidates.',
        );
      })
      .catch((err) => {
        const detail =
          err?.errors?.[0]?.detail || err?.message || 'Unknown error';
        this.flashMessages.danger(`Resolve-and-dedupe failed: ${detail}`);
      })
      .finally(() => {
        this.resolving = false;
      });
  }
}
