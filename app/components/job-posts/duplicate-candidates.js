import Component from '@glimmer/component';

const SIGNAL_LABELS = {
  canonical_link: 'same URL',
  fingerprint: 'same company + title',
  title_similarity: 'title overlap',
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
}
