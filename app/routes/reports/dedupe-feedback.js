import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

export default class ReportsDedupeFeedbackRoute extends Route {
  @service api;

  async model() {
    const { data, error } = await reportFetch(
      this.api,
      'reports/dedupe-feedback',
    );
    if (error) {
      return {
        silent_marks: [],
        canonical_unlinks: [],
        promote_pairs: [],
        totals: { silent_marks: 0, canonical_unlinks: 0, promote_pairs: 0 },
        error,
      };
    }
    return data?.attributes || {};
  }
}
