import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

export default class SettingsAiSpendController extends Controller {
  @service api;
  @service currentUser;
  @service flashMessages;
  @service store;

  @tracked isLoading = false;
  @tracked period = 'daily';
  @tracked groupBy = 'agent_name';
  @tracked days = 30;
  @tracked selectedUserId = '';
  @tracked users = [];

  get buckets() {
    return this.model?.data?.buckets ?? [];
  }

  get totals() {
    return this.model?.data?.totals ?? {};
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

  get isStaff() {
    return this.currentUser.user?.isStaff;
  }

  @action
  async loadUsers() {
    if (!this.isStaff || this.users.length > 0) return;
    try {
      const results = await this.store.findAll('user');
      this.users = results.slice();
    } catch {
      // Non-critical — dropdown just stays empty
    }
  }

  @action
  setUser(event) {
    this.selectedUserId = event.target.value;
    this.reloadData();
  }

  @action
  async reloadData() {
    if (this.isStaff && this.users.length === 0) {
      await this.loadUsers();
    }
    this.isLoading = true;
    try {
      const { data, meta, error } = await reportFetch(
        this.api,
        'ai-usages/summary',
        {
          period: this.period,
          group_by: this.groupBy,
          days: this.days.toString(),
          user_id:
            this.isStaff && this.selectedUserId ? this.selectedUserId : null,
        },
      );
      if (error) {
        this.flashMessages.danger('Failed to load AI spend data.');
        return;
      }
      this.model = { data, meta };
    } catch {
      this.flashMessages.danger('Failed to load AI spend data.');
    } finally {
      this.isLoading = false;
    }
  }

  @action
  setPeriod(value) {
    this.period = value;
    this.reloadData();
  }

  @action
  setGroupBy(value) {
    this.groupBy = value;
    this.reloadData();
  }

  @action
  setDays(value) {
    this.days = parseInt(value, 10) || 30;
    this.reloadData();
  }
}
