import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ApiKeysNewController extends Controller {
  @service spinner;
  @service flashMessages;
  @service router;
  @tracked isSubmitting = false;
  @tracked createdKey = null;

  get canRead() {
    return this.model.scopes.includes('read');
  }

  get canWrite() {
    return this.model.scopes.includes('write');
  }

  @action
  async save() {
    if (this.isSubmitting) return;

    const apiKey = this.model;

    if (!apiKey.name?.trim()) {
      this.flashMessages.danger('API key name is required');
      return;
    }

    this.isSubmitting = true;

    try {
      const savedKey = await apiKey.save();
      this.createdKey = savedKey;
      this.flashMessages.success('API key created successfully');
    } catch (error) {
      this.flashMessages.danger('Failed to create API key');
      console.error('Error creating API key:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  @action
  cancel() {
    this.model.rollbackAttributes();
    this.router.transitionTo('admin.index');
  }

  @action
  goToIndex() {
    this.router.transitionTo('admin.index');
  }

  @action
  toggleScope(scope) {
    const scopes = this.model.scopes || [];
    const index = scopes.indexOf(scope);

    if (index > -1) {
      scopes.splice(index, 1);
    } else {
      scopes.push(scope);
    }
  }
  @action
  derp(event) {
    event.preventDefault();

    this.spinner.wrap(this.model.save());
  }
}
