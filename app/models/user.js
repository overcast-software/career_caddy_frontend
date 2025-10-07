import Model, { attr, hasMany } from '@ember-data/model';

export default class UserModel extends Model {
  @attr('string') name;
  @attr('string') email;
  @attr('string') phone;
  @hasMany('resume', { async: false, inverse: null }) resumes;
  @hasMany('score', { async: false, inverse: null }) scores;
  @hasMany('cover-letter', { async: false, inverse: 'user' }) coverLetters;
  @hasMany('application', { async: false, inverse: null }) applications;
}
