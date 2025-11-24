import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class CompaniesSelector extends Component {
  @service store;
  @service flashMessages;
  @tracked selectedCompany;
  @action updateCompany(company) {
    this.selectedCompany = company;
  }
}
