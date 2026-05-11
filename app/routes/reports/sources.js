import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

export default class ReportsSourcesRoute extends Route {
  @service api;

  queryParams = {
    scope: { refreshModel: true },
    source: { refreshModel: true },
    from: { refreshModel: true },
    to: { refreshModel: true },
    user: { refreshModel: true },
    exclude_stubs: { refreshModel: true },
  };

  async model(params) {
    const scope = params.scope || 'mine';
    const { data, error } = await reportFetch(this.api, 'reports/sources', {
      scope,
      source: params.source,
      from: params.from,
      to: params.to,
      user: params.user,
      exclude_stubs: params.exclude_stubs ? '1' : null,
    });
    if (error) {
      return {
        rows: [],
        bucket_order: [],
        total_job_posts: 0,
        scope,
        error,
      };
    }
    return data?.attributes || {};
  }
}
