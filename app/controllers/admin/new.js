import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ApiKeysNewController extends Controller {
  @service flashMessages;
  @service router;
  @tracked isSubmitting = false;
  @tracked createdKey = null;
  @tracked copyButtonText = 'Copy';

  get canRead() {
    return this.model?.scopes?.includes('read') ?? false;
  }

  get canWrite() {
    return this.model?.scopes?.includes('write') ?? false;
  }

  @action
  async save(event) {
    event?.preventDefault();
    if (this.isSubmitting) return;

    const apiKey = this.model;

    if (!apiKey.name?.trim()) {
      this.flashMessages.danger('API key name is required');
      return;
    }

    this.isSubmitting = true;

    try {
      const savedKey = await apiKey.save();
      this.createdKey = savedKey.key;
      this.flashMessages.success('API key created.');
    } catch (error) {
      this.flashMessages.danger('Failed to create API key.');
      console.error('Error creating API key:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  @action
  async copyKey() {
    try {
      await navigator.clipboard.writeText(this.createdKey);
      this.copyButtonText = 'Copied!';
      setTimeout(() => (this.copyButtonText = 'Copy'), 2000);
    } catch {
      this.flashMessages.danger('Failed to copy.');
    }
  }

  @action
  done() {
    this.createdKey = null;
    this.copyButtonText = 'Copy';
    this.router.transitionTo('admin.index');
  }

  @action
  cancel() {
    this.model.rollbackAttributes();
    this.createdKey = null;
    this.copyButtonText = 'Copy';
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
  updateField(field, event) {
    this.model[field] = event.target.value;
  }
}
