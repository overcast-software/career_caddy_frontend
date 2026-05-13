import Model, { attr, belongsTo } from '@ember-data/model';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

export default class CoverLetterModel extends Model {
  @attr('string') content;
  @attr('string') status;
  @attr('string') instructions;
  @attr('date') createdAt;
  @attr('boolean') favorite;
  @belongsTo('user', { async: true, inverse: 'coverLetters' }) user;
  @belongsTo('job-post', { async: true, inverse: 'coverLetters' }) jobPost;
  @belongsTo('resume', { async: true, inverse: 'coverLetters' }) resume;
  @belongsTo('job-application', { async: true, inverse: 'coverLetters' })
  jobApplication;

  // Server-derived "in flight" gate; F5-survivable. See ScoreModel.isPending.
  get isPending() {
    return this.status && !TERMINAL.has(this.status);
  }
}
