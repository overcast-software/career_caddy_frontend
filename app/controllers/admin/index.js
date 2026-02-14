import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ApiKeysIndexController extends Controller {
  @service flashMessages;
  @service router;

  @action
  async revokeKey(apiKey) {
    if (!confirm(`Are you sure you want to revoke the API key "${apiKey.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      // Call the revoke action on the API key
      await apiKey.destroyRecord();
      this.flashMessages.success('API key revoked successfully');
    } catch (error) {
      this.flashMessages.danger('Failed to revoke API key');
      console.error('Error revoking API key:', error);
    }
  }

  @action
  createNew() {
    this.router.transitionTo('admin.new');
  }
}
