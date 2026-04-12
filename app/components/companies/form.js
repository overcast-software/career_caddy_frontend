import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class CompaniesForm extends Component {
  @service store;
  @service flashMessages;
  get company() {
    return this.args.company;
  }
  @action updateCompanyName(event) {
    this.company.name = event.target.value;
  }

  @action updateCompanyNote(event) {
    this.company.note = event.target.value;
  }

  @action async saveCompany(event) {
    event.preventDefault();
    try {
      await this.company.save();
      this.flashMessages.success('Company saved');
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to save company');
      }
    }
  }
}
