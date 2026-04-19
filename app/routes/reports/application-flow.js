import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ReportsApplicationFlowRoute extends Route {
  @service api;

  queryParams = {
    scope: { refreshModel: true },
  };

  async model(params) {
    const scope = params.scope || 'mine';
    const response = await fetch(
      `${this.api.baseUrl}reports/application-flow/?scope=${encodeURIComponent(scope)}`,
      { headers: this.api.headers() },
    );
    if (!response.ok) {
      return {
        nodes: [],
        links: [],
        total_job_posts: 0,
        total_applications: 0,
        scope,
        error: response.status === 403 ? 'forbidden' : 'failed',
      };
    }
    const payload = await response.json();
    return payload?.data?.attributes || {};
  }
}
