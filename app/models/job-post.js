import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class JobPostModel extends Model {
  @attr('date') createdAt;
  @attr('string') description;
  @attr('string') title;
  @attr('date') postedDate;
  @attr('date') extractionDate;
  @attr link;
  @belongsTo('company', { async: true, inverse: 'jobPosts' }) company;
  @hasMany('score', { async: true, inverse: null }) scores;
  @hasMany('scrape', { async: false, inverse: null }) scrapes;
  @hasMany('cover-letter', { async: true, inverse: 'jobPost' }) coverLetters;
  // @belongsTo('cover-letter', { async: true, inverse: 'job' }) letter;
  @hasMany('application', { async: false, inverse: "jobPost" }) applications;
}
