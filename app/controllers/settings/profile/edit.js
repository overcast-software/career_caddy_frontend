import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
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
  //   { name, value, icon, pinned, seed }
  // `seed` is 'linkedin' | 'github' for the two seeded rows (their edits mirror
  // back to user.linkedin / user.github on save; icon + pinned are locked), or
  // null for ordinary `links` items. The route seeds this in setupController.
  @tracked items = [];

  @tracked wizardEnabled = true;
  @tracked isSubmitting = false;

  // Index of the item currently being dragged (drag-to-order), or null.
  @tracked dragIndex = null;

  iconChoices = ICONS;

  @action updateField(field, event) {
    this[field] = event.target.value;
  }

  @action addItem() {
    this.items = [
      ...this.items,
      { name: '', value: '', icon: 'text', pinned: false, seed: null },
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

  // --- drag-to-order ------------------------------------------------
  // Plain HTML5 drag events over a copy of the array. No Ember-Data array
  // here (this.items is a plain tracked JS array), so reordering is a safe
  // splice + reassign.
  @action onDragStart(index) {
    this.dragIndex = index;
  }

  // dragover must preventDefault to mark the element a valid drop target.
  @action allowDrop(event) {
    event.preventDefault();
  }

  @action onDrop(targetIndex) {
    const from = this.dragIndex;
    this.dragIndex = null;
    if (from === null || from === targetIndex) return;
    const next = [...this.items];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    this.items = next;
  }

  @action onDragEnd() {
    this.dragIndex = null;
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
