import Route from '@ember/routing/route';
import { normalizeItems } from 'career-caddy-frontend/utils/quick-copy';

export default class SettingsQuickCopyRoute extends Route {
  // Same user model as the other settings pages (currentUser.user via the
  // settings parent).
  model() {
    return this.modelFor('settings');
  }

  setupController(controller, model) {
    super.setupController(controller, model);

    // CCEXT-18: seed the unified quick-copy list. LinkedIn/GitHub are the first
    // two (pinned, brand-iconed) seeded rows sourced from their dedicated
    // profile fields — always present so they stay editable even when blank;
    // their edits mirror back to user.linkedin/user.github on save. Everything
    // in `links` is normalized (legacy {name,url} → {name,value,icon,pinned},
    // legacy icon → golf key) and appended so nothing disappears.
    //
    // Each row gets a STABLE `key` (never the array index) so the up/down
    // reorder animates via {{#animated-each key="key"}} — seeds use fixed keys,
    // normalized links use the controller's monotonic key minter.
    controller._keySeq = 0;
    controller.items = [
      {
        key: 'seed:linkedin',
        name: 'LinkedIn',
        value: model.linkedin ?? '',
        icon: 'linkedin',
        pinned: true,
        seed: 'linkedin',
      },
      {
        key: 'seed:github',
        name: 'GitHub',
        value: model.github ?? '',
        icon: 'github',
        pinned: true,
        seed: 'github',
      },
      ...normalizeItems(model.links).map((item) => ({
        ...item,
        key: controller.nextItemKey(),
        seed: null,
      })),
    ];
  }
}
