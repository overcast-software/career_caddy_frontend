import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class SidebarComponent extends Component {
  @service currentUser;
  @service extensions;
  @service router;
  @service theme;
  @tracked copiedField = null;

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

  get clipboardItems() {
    const user = this.currentUser.user;
    if (!user) return [];
    const items = [];
    if (user.linkedin) items.push({ label: 'LinkedIn', value: user.linkedin });
    if (user.github) items.push({ label: 'GitHub', value: user.github });
    if (user.links) {
      const links = Array.isArray(user.links) ? user.links : [];
      links.forEach((link) => {
        if (link.url)
          items.push({ label: link.name || link.url, value: link.url });
      });
    }
    return items;
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
