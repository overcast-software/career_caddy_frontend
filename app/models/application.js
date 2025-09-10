import Model, { attr, belongsTo } from '@ember-data/model';

export default class ApplicationModel extends Model {
  @belongsTo('user', { async: false, inverse: null }) user;
  @belongsTo('job-post', { async: false, inverse: null }) jobPost;
  @belongsTo('resume', { async: false, inverse: null }) resume;
  @belongsTo('cover-letter', { async: false, inverse: null }) coverLetter;
  @attr('date') appliedAt;
  @attr('string') status;
  @attr('string') trackingUrl;
  @attr('string') notes;
}
