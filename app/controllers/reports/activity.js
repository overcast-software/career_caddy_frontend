import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class ReportsActivityController extends Controller {
  @service currentUser;
  @service router;

  queryParams = ['scope', 'from', 'to', 'user'];
  @tracked scope = 'mine';
  @tracked from = '';
  @tracked to = '';
  @tracked user = '';

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

  @action
  showMine() {
    this.router.transitionTo('reports.activity', {
      queryParams: { scope: 'mine', user: '' },
    });
  }

  @action
  showGlobal() {
    if (!this.isStaff) return;
    this.router.transitionTo('reports.activity', {
      queryParams: { scope: 'all' },
    });
  }
}
