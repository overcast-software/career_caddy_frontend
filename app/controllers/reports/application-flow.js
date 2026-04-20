import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class ReportsApplicationFlowController extends Controller {
  @service currentUser;
  @service router;
  @service session;

  get isAuthenticated() {
    return this.session.isAuthenticated;
  }

  queryParams = ['scope', 'source', 'from', 'to', 'user', 'exclude_stubs'];
  @tracked scope = 'mine';
  @tracked source = '';
  @tracked from = '';
  @tracked to = '';
  @tracked user = '';
  @tracked exclude_stubs = '1';

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

  get filters() {
    return {
      source: this.source || '',
      from: this.from || '',
      to: this.to || '',
      user: this.user || '',
      exclude_stubs: this.exclude_stubs || '',
    };
  }

  @action
  showMine() {
    this.router.transitionTo('reports.application-flow', {
      queryParams: { scope: 'mine', user: '' },
    });
  }

  @action
  showGlobal() {
    if (!this.isStaff) return;
    this.router.transitionTo('reports.application-flow', {
      queryParams: { scope: 'all' },
    });
  }

  @action
  applyFilter(patch) {
    this.router.transitionTo('reports.application-flow', {
      queryParams: { ...this.filters, ...patch },
    });
  }
}
