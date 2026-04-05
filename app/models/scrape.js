import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ScrapeModel extends Model {
  @attr('string') url;
  @attr('string') cssSelectors;
  @attr('string') jobContent;
  @attr('string') externalLink;
  @attr('string') parseMethod;
  @attr('date') scrapedAt;
  @attr('string') status;
  @attr('string') html;
  @belongsTo('job-post', { async: true, inverse: 'scrapes' }) jobPost;
  @belongsTo('company', { async: true, inverse: 'scrapes' }) company;
  @hasMany('scrape', { async: true, inverse: 'sourceScrape' }) scrapes;
  @belongsTo('scrape', { async: true, inverse: 'scrapes' }) sourceScrape;
}
