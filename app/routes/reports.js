import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ReportsRoute extends Route {
  @service router;

  redirect(_model, transition) {
    if (transition.to.name === 'reports.index') {
      this.router.replaceWith('reports.application-flow');
    }
  }
}
