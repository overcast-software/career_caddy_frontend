import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AdminAiModelsRoute extends Route {
  @service api;

  async model() {
    const response = await fetch(`${this.api.baseUrl}agent-models/`, {
      headers: this.api.headers(),
    });
    if (!response.ok) return { data: [], meta: null };
    return response.json();
  }
}
