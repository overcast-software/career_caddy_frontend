import Model, { attr, belongsTo } from '@ember-data/model';

export default class CoverLetterModel extends Model {
  @attr('string') content;
  @attr('date') createdAt;
  @belongsTo('user', { async: false, inverse: 'coverLetters' }) user;
  @belongsTo('resume', { async: false, inverse: 'coverLetters' }) resume;
  @belongsTo('job-post', { async: false, inverse: 'coverLetters' }) jobPost;
  @belongsTo('application', { async: false, inverse: 'coverLetter' }) application;
}
