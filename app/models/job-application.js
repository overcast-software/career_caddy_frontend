import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class JobApplicationModel extends Model {
  @attr('date') appliedAt;
  @attr('string', { defaultValue: 'Applied' }) status;
  @attr('string') trackingUrl;
  @attr('string') notes;
  @belongsTo('user', { async: true, inverse: 'jobApplications' }) user;
  @belongsTo('job-post', { async: true, inverse: 'jobApplications' }) jobPost;
  @belongsTo('resume', { async: true, inverse: 'jobApplications' }) resume;
  @hasMany('cover-letter', { async: true, inverse: 'jobApplication' })
  coverLetters;
}
