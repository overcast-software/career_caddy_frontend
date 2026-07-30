import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import move from 'ember-animated/motions/move';
import { easeOut } from 'ember-animated/easings/cosine';
import {
  CUSTOM_ICONS,
  DEFAULT_CUSTOM_ICON,
  normalizeItems,
} from 'career-caddy-frontend/utils/quick-copy';

export default class SettingsQuickCopyController extends Controller {
  @service flashMessages;
  @service router;

  // CCEXT-18: the unified quick-copy list. Each item:
  //   { key, name, value, icon, pinned, seed }
  // `seed` is 'linkedin' | 'github' for the two seeded rows (their edits mirror
  // back to user.linkedin / user.github on save; icon + label are locked), or
  // null for ordinary `links` items (golf icon, arrangeable). `key` is a STABLE
  // client-side id that survives reordering — it drives
  // {{#animated-each key="key"}}, so it must NOT be the array position. The
  // route seeds this in setupController.
  @tracked items = [];
  @tracked isSubmitting = false;

  // Monotonic counter for stable `key`s on newly-added items. Seeded rows use
  // fixed keys ('seed:linkedin' / 'seed:github'); the route resets this.
  _keySeq = 0;

  // The golf icon picker choices for custom items.
  iconChoices = CUSTOM_ICONS;

  // Mint the next stable item key. Reused by the route seed + addItem so a
  // brand-new row gets a key that never collides with a seeded/existing one.
  nextItemKey() {
    this._keySeq += 1;
    return `item:${this._keySeq}`;
  }

  // ember-animated transition for reorders — animate kept sprites to their new
  // slot in parallel. Same generator the resume editor uses
  // (experiences/list.js:24).
  *reorderTransition({ keptSprites }) {
    yield Promise.all(
      keptSprites.map((sprite) => move(sprite, { easing: easeOut })),
    );
  }

  // Index of the first arrangeable (non-seed) item. Seeds (LinkedIn/GitHub) are
  // pinned first and never move, so up/down never crosses this boundary.
  get firstMovableIndex() {
    const i = this.items.findIndex((item) => !item.seed);
    return i === -1 ? this.items.length : i;
  }

  get lastIndex() {
    return this.items.length - 1;
  }

  @action addItem() {
    this.items = [
      ...this.items,
      {
        key: this.nextItemKey(),
        name: '',
        value: '',
        icon: DEFAULT_CUSTOM_ICON,
        pinned: false,
        seed: null,
      },
    ];
  }

  @action updateItemField(index, field, event) {
    const value = event.target.value;
    this.items = this.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
  }

  @action setItemIcon(index, icon) {
    this.items = this.items.map((item, i) =>
      i === index ? { ...item, icon } : item,
    );
  }

  @action removeItem(index) {
    this.items = this.items.filter((_, i) => i !== index);
  }

  // --- reorder via up/down buttons (house pattern) ------------------
  // Swap into a fresh array and reassign for reactivity. `items` is a plain
  // tracked JS array (NOT an Ember-Data ManyArray), so splice-into-a-copy is
  // safe. Persistence is deferred to Save (there is no links reorder verb).
  @action moveUp(index) {
    // Can't move above the first arrangeable slot (seeds stay pinned first).
    if (index <= this.firstMovableIndex) return;
    this._swap(index, index - 1);
  }

  @action moveDown(index) {
    if (index >= this.lastIndex) return;
    this._swap(index, index + 1);
  }

  _swap(a, b) {
    const next = [...this.items];
    [next[a], next[b]] = [next[b], next[a]];
    this.items = next;
  }

  // Re-seed the list from the current model — discards unsaved edits (Cancel).
  @action cancel() {
    this._keySeq = 0;
    const user = this.model;
    this.items = [
      {
        key: 'seed:linkedin',
        name: 'LinkedIn',
        value: user.linkedin ?? '',
        icon: 'linkedin',
        pinned: true,
        seed: 'linkedin',
      },
      {
        key: 'seed:github',
        name: 'GitHub',
        value: user.github ?? '',
        icon: 'github',
        pinned: true,
        seed: 'github',
      },
      ...normalizeItems(user.links).map((item) => ({
        ...item,
        key: this.nextItemKey(),
        seed: null,
      })),
    ];
    this.flashMessages.info('Changes discarded.');
  }

  @action save(event) {
    event?.preventDefault();
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const user = this.model;

    // Mirror the seeded LinkedIn/GitHub items back to their dedicated fields
    // (kept canonical for Profile + the extension + public profile), and
    // persist the rest as `links` items in the arranged order.
    const linkedinItem = this.items.find((i) => i.seed === 'linkedin');
    const githubItem = this.items.find((i) => i.seed === 'github');
    user.linkedin = (linkedinItem?.value || '').trim();
    user.github = (githubItem?.value || '').trim();
    user.links = this.items
      .filter((i) => !i.seed)
      .filter((i) => i.name || i.value)
      .map((i) => ({
        name: i.name,
        value: i.value,
        icon: i.icon,
        pinned: Boolean(i.pinned),
      }));

    user
      .save()
      .then(() => {
        this.flashMessages.success('Quick-copy items saved.');
      })
      .catch(() => {
        this.flashMessages.danger('Failed to save quick-copy items.');
        user.rollbackAttributes();
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }
}
