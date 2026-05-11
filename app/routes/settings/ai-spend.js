import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

export default class SettingsAiSpendRoute extends Route {
  @service api;

  async model() {
    const { data, meta, error } = await reportFetch(
      this.api,
      'ai-usages/summary',
      { period: 'daily', group_by: 'agent_name', days: '30' },
    );
    if (error) return null;
    return { data, meta };
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    // Populate the staff-only user dropdown on first render. Controller's
    // loadUsers() guards on isStaff and idempotency, so it's safe to call
    // unconditionally here.
    controller.loadUsers();
  }
}
