import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

export default class AdminAiModelsRoute extends Route {
  @service api;

  async model() {
    const { data, meta } = await reportFetch(this.api, 'agent-models');
    return { data: data ?? [], meta };
  }
}
