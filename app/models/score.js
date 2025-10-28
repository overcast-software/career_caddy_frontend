import Model, { attr, belongsTo } from '@ember-data/model';

export default class ScoreModel extends Model {
  @attr('number') score;
  @attr('string') explanation;
  @belongsTo('resume', { async: true, inverse: "scores" }) resume;
  @belongsTo('job-post', { async: true, inverse: 'scores' }) jobPost;
  @belongsTo('user', { async: false, inverse: "scores" }) user;
}
