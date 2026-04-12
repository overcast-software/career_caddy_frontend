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

  get isHold() {
    return this.args.scrape.status === 'hold';
  }

  @action
  updateField(field, event) {
    this.args.scrape[field] = event.target.value;
  }

  @action
  setStatus(status) {
    this.args.scrape.status = status;
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
  async submitDelete(event) {
    event.preventDefault();
    try {
      await this.args.scrape.destroyRecord();
      this.flashMessages.success('Scrape deleted');
      this.router.transitionTo('scrapes.index');
    } catch {
      this.flashMessages.danger('Failed to delete scrape');
    }
  }
}
