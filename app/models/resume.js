import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ResumeModel extends Model {
  @attr('string') content;
  @attr('string') filePath;
  @belongsTo('user', { async: false, inverse: null }) user;
  @hasMany('score', { async: false, inverse: null }) scores;
  @hasMany('cover-letter', { async: false, inverse: null }) coverLetters;
  @hasMany('application', { async: false, inverse: null }) applications;
}
