import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class QuestionModel extends Model {
  @attr content;
  @attr favorite;
  @hasMany('answer', { async: true, inverse: 'question' }) answers;
  @belongsTo('company', { async: true, inverse: 'questions' }) company;
  @belongsTo('job-application', { async: true, inverse: 'questions' })
  jobApplication;
  @belongsTo('job-post', { async: true, inverse: 'questions' }) jobPost;
}
