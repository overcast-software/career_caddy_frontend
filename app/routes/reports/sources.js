import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ReportsSourcesRoute extends Route {
  @service api;

  queryParams = {
    scope: { refreshModel: true },
  };

  async model(params) {
    const scope = params.scope || 'mine';
    const response = await fetch(
      `${this.api.baseUrl}reports/sources/?scope=${encodeURIComponent(scope)}`,
      { headers: this.api.headers() },
    );
    if (!response.ok) {
      return {
        rows: [],
        bucket_order: [],
        total_job_posts: 0,
        scope,
        error: response.status === 403 ? 'forbidden' : 'failed',
      };
    }
    const payload = await response.json();
    return payload?.data?.attributes || {};
  }
}
