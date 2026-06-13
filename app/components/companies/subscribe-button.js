import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Phase 6a — Subscribe affordance for federation-enabled Companies.
// Surfaces the ``acct:<slug>@<host>`` handle for Mastodon-style
// follow. Hidden entirely when the Company is not federation-enabled
// or has no slug yet — no greyed-out state.
//
// Host derivation: read from ``window.location.host`` rather than
// config, so the same build serves multiple instances correctly
// (mirror cluster, dev tunnels, etc.) and we don't bake
// careercaddy.online into the bundle.
export default class CompaniesSubscribeButtonComponent extends Component {
  @service flashMessages;

  @tracked copyButtonText = 'Copy';

  get host() {
    if (typeof window === 'undefined' || !window.location) return '';
    return window.location.host;
  }

  get handle() {
    const slug = this.args.company?.slug;
    const host = this.host;
    if (!slug || !host) return '';
    return `acct:${slug}@${host}`;
  }

  get shouldRender() {
    return Boolean(
      this.args.company?.federationEnabled && this.args.company?.slug,
    );
  }

  @action
  copyHandle() {
    const handle = this.handle;
    if (!handle) return;
    navigator.clipboard
      .writeText(handle)
      .then(() => {
        this.copyButtonText = 'Copied!';
        setTimeout(() => {
          this.copyButtonText = 'Copy';
        }, 2000);
      })
      .catch(() => {
        this.flashMessages.danger('Failed to copy handle.');
      });
  }
}
