import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { composeQuickCopyItems } from 'career-caddy-frontend/utils/quick-copy';

export default class SettingsProfileIndexController extends Controller {
  @service flashMessages;

  // The index of the quick-copy item most recently copied, for the "Copied!"
  // affordance. Null when nothing is showing the affordance.
  @tracked copiedIndex = null;

  // CCEXT-18: the unified quick-copy list — LinkedIn + GitHub (seeded from their
  // dedicated fields) followed by the normalized `links` items, each carrying an
  // icon. Derived on the model via the shared composer so the read view, the
  // sidebar, and the extension all agree.
  get quickCopyItems() {
    return composeQuickCopyItems(this.model);
  }

  // One-click copy (kills the old two-click). Reads the item's value straight
  // off the composed list by index. .then/.catch — no async/await.
  @action copyItem(index) {
    const item = this.quickCopyItems[index];
    if (!item?.value) return;
    navigator.clipboard
      .writeText(item.value)
      .then(() => {
        this.copiedIndex = index;
        setTimeout(() => {
          this.copiedIndex = null;
        }, 2000);
      })
      .catch(() => {
        this.flashMessages.danger('Failed to copy to clipboard.');
      });
  }
}
