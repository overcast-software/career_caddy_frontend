import Component from '@glimmer/component';

export default class JobPostsListComponent extends Component {
  get jobPosts() {
    return this.args.jobPosts?.toArray?.() ?? [];
  }

  bestScore(jobPost) {
    const rawScores = jobPost.scores;
    const scores = rawScores?.toArray?.() ? rawScores.toArray() : rawScores ?? [];

    if (!scores.length) return null;

    let best = null;
    for (const s of scores) {
      if (s?.score == null) continue;
      if (best === null || s.score > best.score) {
        best = s;
      }
    }
    return best;
  }
}
