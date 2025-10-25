import Model, { attr, belongsTo } from '@ember-data/model';

export default class SummaryModel extends Model {
  @attr('string') content;
  @attr('boolean') active;
  @belongsTo('user', { async: false, inverse: null }) user;
  @belongsTo('job-post', { async: false, inverse: null }) jobPost;
  @belongsTo('resume', { async: false, inverse: "summaries" }) resume;
}
