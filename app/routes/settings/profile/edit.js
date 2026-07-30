import Route from '@ember/routing/route';
import { normalizeItems } from 'career-caddy-frontend/utils/quick-copy';

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
    controller.address = model.address ?? '';

    // CCEXT-18: seed the unified quick-copy list. LinkedIn/GitHub are the first
    // two (pinned, iconed) seeded rows sourced from their dedicated fields —
    // always present so they stay editable even when blank; their edits mirror
    // back on save. Everything in `links` is normalized (legacy {name,url} →
    // {name,value,icon,pinned}) and appended so nothing disappears.
    controller.items = [
      {
        name: 'LinkedIn',
        value: model.linkedin ?? '',
        icon: 'linkedin',
        pinned: true,
        seed: 'linkedin',
      },
      {
        name: 'GitHub',
        value: model.github ?? '',
        icon: 'github',
        pinned: true,
        seed: 'github',
      },
      ...normalizeItems(model.links).map((item) => ({ ...item, seed: null })),
    ];

    const onboarding = model.onboarding || {};
    controller.wizardEnabled = onboarding.wizard_enabled !== false;
  }
}
