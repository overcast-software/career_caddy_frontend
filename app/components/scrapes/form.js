import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class ScrapesFormComponent extends Component {
  @service router;
  @service flashMessages;
  @service currentUser;

  get showHoldOption() {
    return this.currentUser.user?.isStaff && this.args.scrape.isNew;
  }

  @action
  updateField(field, event) {
    this.args.scrape[field] = event.target.value;
  }

  @action
  async submitEdit(event) {
    event.preventDefault();
    try {
      await this.args.scrape.save();
      this.flashMessages.success('Scrape saved');
      this.router.transitionTo('scrapes.show', this.args.scrape.id);
    } catch {
      this.flashMessages.danger('Failed to save scrape');
    }
  }

  @action
  async submitHold() {
    this.args.scrape.status = 'hold';
    try {
      await this.args.scrape.save();
      this.flashMessages.success('Scrape held for external service');
      this.router.transitionTo('scrapes.show', this.args.scrape.id);
    } catch {
      this.flashMessages.danger('Failed to save scrape');
    }
  }

  @action
  async submitDelete(event) {
    event.preventDefault();
    try {
      await this.args.scrape.destroyRecord();
      this.flashMessages.success('Scrape deleted');
      this.router.transitionTo('scrapes.index');
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to delete scrape.');
      }
    }
  }
}
