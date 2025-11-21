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

  @action saveCompany(event) {
    event.preventDefault()
    this.company.save();
    this.flashMessages.success('success');
  }
}
