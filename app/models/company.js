import Model, { attr, hasMany } from '@ember-data/model';
export default class CompanyModel extends Model {
  @attr('string') name;
  @attr('string') displayName;
  @attr('string') note;
  @hasMany('job-post', { async: true, inverse: 'company' }) jobPosts;
  @hasMany('scrape', { async: false, inverse: 'company' }) scrapes;
  @hasMany('question', { async: true, inverse: 'company' }) questions;
  @hasMany('experience', { async: true, inverse: 'company' }) experiences;
  @hasMany('job-application', { async: true, inverse: 'company' })
  jobApplications;
  @hasMany('score', { async: true, inverse: 'company' }) scores;
}
