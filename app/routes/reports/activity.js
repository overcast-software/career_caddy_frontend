import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

export default class ReportsActivityRoute extends Route {
  @service api;

  queryParams = {
    scope: { refreshModel: true },
    from: { refreshModel: true },
    to: { refreshModel: true },
    user: { refreshModel: true },
  };

  async model(params) {
    const scope = params.scope || 'mine';
    const { data, error } = await reportFetch(this.api, 'reports/activity', {
      scope,
      from: params.from,
      to: params.to,
      user: params.user,
    });
    if (error) {
      return {
        days: [],
        total_applications: 0,
        scope,
        error,
      };
    }
    return data?.attributes || {};
  }
}
