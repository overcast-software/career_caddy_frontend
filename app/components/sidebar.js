import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { getProfession } from 'career-caddy-frontend/utils/wizard-storage';
import { composeQuickCopyItems } from 'career-caddy-frontend/utils/quick-copy';

export default class SidebarComponent extends Component {
  @service currentUser;
  @service extensions;
  @service router;
  @service theme;
  @tracked copiedField = null;

  get wizardActive() {
    const onboarding = this.currentUser.onboarding;
    if (!onboarding) return false;
    return onboarding.isWizardActive({
      isStaff: Boolean(this.currentUser.user?.isStaff),
      profession: getProfession(),
    });
  }

  get sidebarExtensions() {
    const authed = !this.currentUser.isGuest;
    return this.extensions
      .entriesAt('sidebar')
      .filter((e) => !e.authOnly || authed);
  }

  get footerExtensions() {
    const authed = !this.currentUser.isGuest;
    return this.extensions
      .entriesAt('footer')
      .filter((e) => !e.authOnly || authed);
  }

  get isDocsRoute() {
    return this.router.currentRouteName?.startsWith('docs');
  }

  // CCEXT-18: the unified quick-copy list. composeQuickCopyItems is the shared
  // seed source of truth (LinkedIn + GitHub + normalized `links` items, each
  // carrying an `icon`); the settings read/edit views and the extension use the
  // same composer. Map `name` → `label` to keep the existing template markup.
  get clipboardItems() {
    return composeQuickCopyItems(this.currentUser.user).map((item) => ({
      label: item.name || item.value,
      value: item.value,
      icon: item.icon,
    }));
  }

  @action
  goToReports() {
    this.router.transitionTo('reports');
    if (this.args.onClose) this.args.onClose();
  }

  @action
  async copyToClipboard(item) {
    try {
      await navigator.clipboard.writeText(item.value);
      this.copiedField = item.label;
      setTimeout(() => {
        this.copiedField = null;
      }, 1500);
    } catch {
      // clipboard failed silently
    }
  }
}
