import Model, { attr, belongsTo } from '@ember-data/model';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

export default class SummaryModel extends Model {
  @attr('string') content;
  @attr('string') status;
  @attr('boolean') active;
  @attr('string') instructions;
  @belongsTo('user', { async: true, inverse: 'summaries' }) user;
  @belongsTo('job-post', { async: true, inverse: 'summaries' }) jobPost;
  @belongsTo('resume', { async: true, inverse: 'summaries' }) resume;

  // Server-derived "in flight" gate; F5-survivable. See ScoreModel.isPending.
  get isPending() {
    return this.status && !TERMINAL.has(this.status);
  }
}
