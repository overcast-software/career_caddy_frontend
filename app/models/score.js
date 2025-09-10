import Model, { attr, belongsTo } from '@ember-data/model';

export default class ScoreModel extends Model {
  @attr('number') score;
  @attr('string') explanation;
  @belongsTo('resume', { async: false, inverse: null }) resume;
  @belongsTo('job-post', { async: false, inverse: null }) jobPost;
  @belongsTo('user', { async: false, inverse: null }) user;
}
