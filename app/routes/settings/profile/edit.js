import Route from '@ember/routing/route';

export default class SettingsProfileEditRoute extends Route {
  model() {
    return this.modelFor('settings.profile');
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.firstName = model.firstName ?? '';
    controller.lastName = model.lastName ?? '';
    controller.email = model.email ?? '';
    controller.phone = model.phone ?? '';
    controller.linkedin = model.linkedin ?? '';
    controller.github = model.github ?? '';
    controller.address = model.address ?? '';
    controller.links = Array.isArray(model.links)
      ? model.links.map((l) => ({ ...l }))
      : [];
    const onboarding = model.onboarding || {};
    controller.wizardEnabled = onboarding.wizard_enabled !== false;
  }
}
