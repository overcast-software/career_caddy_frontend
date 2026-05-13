import Model, { attr, belongsTo } from '@ember-data/model';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

export default class ScoreModel extends Model {
  @attr('number') score;
  @attr('string') explanation;
  @attr('string') status;
  @attr('string') instructions;
  @attr('date') createdAt;
  @belongsTo('resume', { async: true, inverse: 'scores' }) resume;
  @belongsTo('job-post', { async: true, inverse: 'scores' }) jobPost;
  @belongsTo('user', { async: true, inverse: 'scores' }) user;
  @belongsTo('company', { async: true, inverse: 'scores' }) company;

  // Server-derived "in flight" gate. Templates use this to decide whether
  // to render the row spinner — F5-survivable because it reads `status`,
  // not the session-scoped `pollable.pendingIds`. Per-record naturally
  // (each row has its own status) so it can't cross-contaminate sibling
  // scores the way the pre-2026-04-16 controller-level boolean did.
  get isPending() {
    return this.status && !TERMINAL.has(this.status);
  }
}
