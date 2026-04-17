import Route from '@ember/routing/route';

export default class SettingsProfileIndexRoute extends Route {
  model() {
    return this.modelFor('settings.profile');
  }
}
