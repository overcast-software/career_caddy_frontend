import Model, { attr, hasMany } from '@ember-data/model';

export default class UserModel extends Model {
  @attr('string') firstName;
  @attr('string') lastName;
  @attr('string') username;
  @attr('string') email;
  @attr('string') phone;
  @attr('string') password;
  @attr('boolean') isAdmin;
  @hasMany('resume', { async: true, inverse: 'user' }) resumes;
  @hasMany('score', { async: true, inverse: 'user' }) scores;
  @hasMany('cover-letter', { async: false, inverse: 'user' }) coverLetters;
  @hasMany('job-application', { async: true, inverse: 'user' }) jobApplications;
  @hasMany('summary', { async: true, inverse: 'user' }) summaries;
  get name() {
    return `${this.firstName} ${this.lastName}`;
  }
}
