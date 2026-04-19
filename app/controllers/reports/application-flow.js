import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class ReportsApplicationFlowController extends Controller {
  @service currentUser;
  @service router;

  queryParams = ['scope'];
  @tracked scope = 'mine';

  get isStaff() {
    return this.currentUser.user?.isStaff;
  }

  get isMine() {
    return (this.scope || 'mine') === 'mine';
  }

  get isForbidden() {
    return this.model?.error === 'forbidden';
  }

  get isFailed() {
    return this.model?.error === 'failed';
  }

  get isEmpty() {
    return !this.isForbidden && !this.isFailed && !this.model?.total_job_posts;
  }

  @action
  showMine() {
    this.router.transitionTo('reports.application-flow', {
      queryParams: { scope: 'mine' },
    });
  }

  @action
  showGlobal() {
    if (!this.isStaff) return;
    this.router.transitionTo('reports.application-flow', {
      queryParams: { scope: 'all' },
    });
  }
}
