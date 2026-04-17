import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SettingsIndexRoute extends Route {
  @service router;

  beforeModel() {
    // Temporary redirect until settings index gets its own page
    this.router.replaceWith('settings.profile');
  }
}
