import Model, { attr, hasMany } from '@ember-data/model';

export default class UserModel extends Model {
  @attr('string') firstName;
  @attr('string') lastName;
  @attr('string') username;
  @attr('string') email;
  @attr('string') phone;
  @attr('string') password;
  @attr('boolean') isAdmin;
  @hasMany('resume', { async: true, inverse: null }) resumes;
  @hasMany('score', { async: false, inverse: null }) scores;
  @hasMany('cover-letter', { async: false, inverse: 'user' }) coverLetters;
  @hasMany('application', { async: false, inverse: null }) applications;
}
