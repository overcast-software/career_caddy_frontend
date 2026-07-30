import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import move from 'ember-animated/motions/move';
import { easeOut } from 'ember-animated/easings/cosine';
import { ICONS } from 'career-caddy-frontend/utils/quick-copy';

export default class SettingsProfileEditController extends Controller {
  @service flashMessages;
  @service router;

  @tracked firstName = '';
  @tracked lastName = '';
  @tracked email = '';
  @tracked phone = '';
  @tracked address = '';

  // CCEXT-18: the unified quick-copy list. Each item:
  //   { key, name, value, icon, pinned, seed }
  // `seed` is 'linkedin' | 'github' for the two seeded rows (their edits mirror
  // back to user.linkedin / user.github on save; icon + pinned are locked), or
  // null for ordinary `links` items. `key` is a STABLE client-side id that
  // survives reordering — it drives {{#animated-each key="key"}}, so it must
  // NOT be the array position (keying by index would kill the reorder
  // animation). The route seeds this in setupController.
  @tracked items = [];

  @tracked wizardEnabled = true;
  @tracked isSubmitting = false;

  // Monotonic counter for stable `key`s on newly-added items. Seeded rows use
  // fixed keys ('seed:linkedin' / 'seed:github'); the route resets this via
  // nextItemKey based on the items it seeds.
  _keySeq = 0;

  iconChoices = ICONS;

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

  @action updateField(field, event) {
    this[field] = event.target.value;
  }

  @action addItem() {
    this.items = [
      ...this.items,
      {
        key: this.nextItemKey(),
        name: '',
        value: '',
        icon: 'text',
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

  @action updateWizardEnabled(event) {
    this.wizardEnabled = Boolean(event.target.checked);
  }

  @action cancel() {
    this.router.transitionTo('settings.profile');
  }

  @action save(event) {
    event?.preventDefault();
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const user = this.model;
    user.firstName = this.firstName;
    user.lastName = this.lastName;
    user.email = this.email;
    user.phone = this.phone;
    user.address = this.address;

    // Mirror the seeded LinkedIn/GitHub items back to their dedicated fields
    // (kept canonical for the extension + public profile), and persist the rest
    // as `links` items in the same order the user arranged them.
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

    user.onboarding = {
      ...(user.onboarding || {}),
      wizard_enabled: Boolean(this.wizardEnabled),
    };

    user
      .save()
      .then(() => {
        this.flashMessages.success('Profile updated.');
        this.router.transitionTo('settings.profile');
      })
      .catch(() => {
        this.flashMessages.danger('Failed to update profile.');
        user.rollbackAttributes();
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }
}
