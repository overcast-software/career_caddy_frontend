import Model, { attr, belongsTo } from '@ember-data/model';

export default class CoverLetterModel extends Model {
  @attr('string') content;
  @attr('date') createdAt;
  @belongsTo('user', { async: false, inverse: 'coverLetters' }) user;
  @belongsTo('job-post', { async: true, inverse: 'coverLetters' }) jobPost;
  @belongsTo('resume', { async: true, inverse: 'coverLetters' }) resume;
  @belongsTo('job-application', { async: true, inverse: 'coverLetters' })
  jobApplication;
  get derp() {
    return 'derp';
  }
}
