import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { getOwner } from '@ember/application';
export default class ApplicationController extends Controller {
  @service session;
  @service flashMessages;
  @service currentUser;
  @service router;
  @tracked loading = false

  get isProduction() {
    const cfg = getOwner(this).resolveRegistration('config:environment');
    return (cfg && cfg.environment === 'production');
  }

  @action
  async invalidateSession() {
    await this.session.invalidate();
  }

  @action setLoading(loading){
    this.loading = loading
  }
}
