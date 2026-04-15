import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SettingsAiSpendRoute extends Route {
  @service api;

  async model() {
    const params = new URLSearchParams({
      period: 'daily',
      group_by: 'agent_name',
      days: '30',
    });
    const response = await fetch(
      `${this.api.baseUrl}ai-usages/summary/?${params}`,
      { headers: this.api.headers() },
    );
    if (!response.ok) return null;
    return response.json();
  }
}
