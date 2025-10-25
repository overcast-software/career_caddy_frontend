import Model, { attr, hasMany } from '@ember-data/model';

export default class CompanyModel extends Model {
  @attr('string') name;
  @attr('string') displayName;
  @hasMany('job-post', { async: true, inverse: 'company' }) jobPosts;
  @hasMany('scrape', { async: false, inverse: null }) scrapes;
  @hasMany('experience', { async: false, inverse: 'company' }) experiences;
}
