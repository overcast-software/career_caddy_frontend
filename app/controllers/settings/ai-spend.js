import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SettingsAiSpendController extends Controller {
  @service api;
  @service flashMessages;

  @tracked isLoading = false;
  @tracked spendData = null;
  @tracked period = 'daily';
  @tracked groupBy = 'agent_name';
  @tracked days = 30;

  get buckets() {
    return this.spendData?.data?.buckets ?? [];
  }

  get totals() {
    return this.spendData?.data?.totals ?? {};
  }

  get hasBuckets() {
    return this.buckets.length > 0;
  }

  get formattedTotalCost() {
    const cost = parseFloat(this.totals.estimated_cost_usd || 0);
    return `$${cost.toFixed(4)}`;
  }

  get formattedTotalTokens() {
    const tokens = this.totals.total_tokens || 0;
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  }

  get avgCostPerRequest() {
    const cost = parseFloat(this.totals.estimated_cost_usd || 0);
    const count = this.totals.request_count || 0;
    if (count === 0) return '$0.0000';
    return `$${(cost / count).toFixed(4)}`;
  }

  @action
  async loadData() {
    this.isLoading = true;
    try {
      const params = new URLSearchParams({
        period: this.period,
        group_by: this.groupBy,
        days: this.days.toString(),
      });
      const response = await fetch(
        `${this.api.baseUrl}ai-usages/summary/?${params}`,
        { headers: this.api.headers() },
      );
      if (!response.ok) {
        this.flashMessages.danger('Failed to load AI spend data.');
        return;
      }
      this.spendData = await response.json();
    } catch {
      this.flashMessages.danger('Failed to load AI spend data.');
    } finally {
      this.isLoading = false;
    }
  }

  @action
  setPeriod(value) {
    this.period = value;
    this.loadData();
  }

  @action
  setGroupBy(value) {
    this.groupBy = value;
    this.loadData();
  }

  @action
  setDays(value) {
    this.days = parseInt(value, 10) || 30;
    this.loadData();
  }
}
