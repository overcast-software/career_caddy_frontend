import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class JobPostModel extends Model {
  @attr('date') createdAt;
  @attr('string') description;
  @attr('string') title;
  @attr('date') postedDate;
  @attr('date') extractionDate;
  @attr('string') link;
  @belongsTo('company', { async: true, inverse: 'jobPosts' }) company;
  @hasMany('score', { async: true, inverse: 'jobPost' }) scores;
  @hasMany('scrape', { async: true, inverse: 'jobPost' }) scrapes;
  @hasMany('cover-letter', { async: true, inverse: 'jobPost' }) coverLetters;
  @hasMany('job-application', { async: true, inverse: 'jobPost' }) jobApplications;
  @hasMany('summary', { async: true, inverse: 'jobPost' }) summaries;
}
