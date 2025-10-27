import Model, { attr, belongsTo } from '@ember-data/model';

export default class ApplicationModel extends Model {
  @attr('date') appliedAt;
  @attr('string') status;
  @attr('string') trackingUrl;
  @attr('string') notes;
  @belongsTo('user', { async: true, inverse: 'applications' }) user;
  @belongsTo('job-post', { async: true, inverse: 'applications' }) jobPost;
  @belongsTo('resume', { async: true, inverse: 'applications' }) resume;
  @belongsTo('cover-letter', { async: true, inverse: 'application' }) coverLetter;
}
