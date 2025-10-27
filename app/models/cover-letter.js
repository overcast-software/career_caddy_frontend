import Model, { attr, belongsTo } from '@ember-data/model';

export default class CoverLetterModel extends Model {
  @attr('string') content;
  @attr('date') createdAt;
  @belongsTo('user', { async: false, inverse: 'coverLetters' }) user;
  @belongsTo('job-post', { async: true, inverse: 'coverLetters' }) jobPost;
  // @belongsTo('job-post', { async: true, inverse: 'letter' }) job;
  @belongsTo('resume', { async: true, inverse: 'coverLetters' }) resume;
  @belongsTo('application', { async: true, inverse: 'coverLetter' }) application;
}
