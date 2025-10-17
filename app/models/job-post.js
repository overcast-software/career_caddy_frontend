import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class JobPostModel extends Model {
  @attr('date') createdAt;
  @attr('string') description;
  @attr('string') title;
  @attr('date') postedDate;
  @attr('date') extractionDate;
  @belongsTo('company', { async: true, inverse: null }) company;
  @hasMany('score', { async: true, inverse: null }) scores;
  @hasMany('scrape', { async: false, inverse: null }) scrapes;
  @hasMany('cover-letter', { async: false, inverse: 'jobPost' }) coverLetters;
  @hasMany('application', { async: false, inverse: null }) applications;
}
