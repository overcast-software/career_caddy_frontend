import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ReportsApplicationFlowRoute extends Route {
  @service api;

  queryParams = {
    scope: { refreshModel: true },
    source: { refreshModel: true },
    from: { refreshModel: true },
    to: { refreshModel: true },
    user: { refreshModel: true },
  };

  async model(params) {
    const qs = new URLSearchParams();
    qs.set('scope', params.scope || 'mine');
    if (params.source) qs.set('source', params.source);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.user) qs.set('user', params.user);
    const response = await fetch(
      `${this.api.baseUrl}reports/application-flow/?${qs.toString()}`,
      { headers: this.api.headers() },
    );
    if (!response.ok) {
      return {
        nodes: [],
        links: [],
        total_job_posts: 0,
        total_applications: 0,
        scope: params.scope || 'mine',
        error: response.status === 403 ? 'forbidden' : 'failed',
      };
    }
    const payload = await response.json();
    return payload?.data?.attributes || {};
  }
}
