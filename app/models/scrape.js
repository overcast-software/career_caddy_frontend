import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ScrapeModel extends Model {
  @attr('string') url;
  @attr('string') cssSelectors;
  @attr('string') jobContent;
  @attr('string') externalLink;
  @attr('string') parseMethod;
  @attr('date') scrapedAt;
  @attr('string') state;
  @attr('string') html;
  @belongsTo('job-post', { async: false, inverse: 'scrapes' }) jobPost;
  @belongsTo('company', { async: false, inverse: 'scrapes' }) company;
  @hasMany('scrape', { async: false, inverse: 'sourceScrape' }) scrapes;
  @belongsTo('scrape', { async: false, inverse: 'scrapes' }) sourceScrape;
}
