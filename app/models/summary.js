import Model, { attr, belongsTo } from '@ember-data/model';

export default class SummaryModel extends Model {
  @attr('string') content;
  @attr('boolean') active;
  @belongsTo('user', { async: true, inverse: 'summaries' }) user;
  @belongsTo('job-post', { async: true, inverse: 'summaries' }) jobPost;
  @belongsTo('resume', { async: true, inverse: 'summaries' }) resume;
}
