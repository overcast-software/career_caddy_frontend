import Route from '@ember/routing/route';

export default class SettingsProfileRoute extends Route {
  model() {
    return this.modelFor('settings');
  }
}
