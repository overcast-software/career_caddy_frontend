import Model, { attr, belongsTo } from '@ember-data/model';

export default class SummaryModel extends Model {
  @attr('string') content;
  @attr('boolean') active;
  @belongsTo('user', { async: false, inverse: 'summaries' }) user;
  @belongsTo('job-post', { async: false, inverse: 'summaries' }) jobPost;
  @belongsTo('resume', { async: false, inverse: "summaries" }) resume;
}
