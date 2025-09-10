import Model, { attr, belongsTo } from '@ember-data/model';

export default class ScrapeModel extends Model {
  @attr('string') url;
  @attr('string') cssSelectors;
  @attr('string') jobContent;
  @attr('string') externalLink;
  @attr('string') parseMethod;
  @attr('date') scrapedAt;
  @attr('string') state;
  @attr('string') html;
  @belongsTo('job-post', { async: false, inverse: null }) jobPost;
  @belongsTo('company', { async: false, inverse: null }) company;
  @belongsTo('scrape', { async: false, inverse: null }) sourceScrape;
}
