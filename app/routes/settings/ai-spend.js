import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

export default class SettingsAiSpendRoute extends Route {
  @service api;
  @service currentUser;
  @service store;

  async model() {
    const isStaff = Boolean(this.currentUser.user?.isStaff);
    const [report, users] = await Promise.all([
      reportFetch(this.api, 'ai-usages/summary', {
        period: 'daily',
        group_by: 'agent_name',
        days: '30',
      }),
      // Staff-only user dropdown. `reload: true` bypasses Ember Data's
      // cache-only short-circuit (which on a cold refresh returns just
      // currentUser.user without re-fetching). Returned RecordArray is
      // live + reactive; never .slice() it (memory: feedback_async_hasmany_js).
      isStaff
        ? this.store.findAll('user', { reload: true })
        : Promise.resolve(null),
    ]);
    if (report.error) return null;
    return {
      data: report.data,
      meta: report.meta,
      users,
    };
  }
}
