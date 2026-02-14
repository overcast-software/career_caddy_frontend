import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ApiKeysShowController extends Controller {
  @service flashMessages;
  @service router;

  @action
  async revokeKey() {
    const apiKey = this.model;
    
    if (!confirm(`Are you sure you want to revoke the API key "${apiKey.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await apiKey.destroyRecord();
      this.flashMessages.success('API key revoked successfully');
      this.router.transitionTo('admin.index');
    } catch (error) {
      this.flashMessages.danger('Failed to revoke API key');
      console.error('Error revoking API key:', error);
    }
  }
}
