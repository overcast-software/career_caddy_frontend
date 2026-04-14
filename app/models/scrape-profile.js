import Model, { attr } from '@ember-data/model';

export default class ScrapeProfileModel extends Model {
  @attr('string') hostname;
  @attr('boolean') requiresAuth;
  @attr('number') avgContentLength;
  @attr('number') successRate;
  @attr() cssSelectors;
  @attr('string') extractionHints;
  @attr('string') pageStructure;
  @attr('date') lastSuccessAt;
  @attr('number') scrapeCount;
  @attr('string') preferredTier;
  @attr('boolean') enabled;
  @attr('date') createdAt;
  @attr('date') updatedAt;

  get tierLabel() {
    const labels = {
      auto: 'Auto',
      0: 'Tier 0',
      1: 'Tier 1',
      2: 'Tier 2',
      3: 'Tier 3',
    };
    return labels[this.preferredTier] || this.preferredTier;
  }

  get successRatePercent() {
    return Math.round((this.successRate || 0) * 100);
  }

  get successRateClass() {
    const pct = this.successRatePercent;
    if (pct >= 80) return 'text-green-600 dark:text-green-400';
    if (pct >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }
}
