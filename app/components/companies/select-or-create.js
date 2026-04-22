import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class CompaniesSelectOrCreate extends Component {
  @service store;
  @service flashMessages;
  @tracked showCreate = false;
  @tracked _selectedCompany = null;

  constructor() {
    super(...arguments);
    if (!this.args.companies) {
      this.store.findAll('company');
    }
  }

  get companies() {
    return this.args.companies ?? this.store.peekAll('company');
  }

  get selectedCompany() {
    return this.args.selected ?? this._selectedCompany;
  }

  @tracked proposedCompanyName = null;
  @tracked labelText = 'Select a company (option to create if no results)';

  @action toggleCreateForm() {
    this.showCreate = !this.showCreate;
  }

  @action updateCompany(company) {
    this.proposedCompanyName = company?.name;
    this._selectedCompany = company;
    this.args.onSelect?.(company);
  }

  @action companyFilter(company) {
    this.args.companyCallback?.(company);
  }

  @action selectInput(text, select) {
    if (select.results.length === 0) {
      this.labelText = `Press Enter to create a company ${text}`;
      this.proposedCompanyName = text;
    }
  }

  @action async companyKeydown(dropdown, e) {
    if (dropdown.results.length === 0 && e.key === 'Enter') {
      const company = this.store.createRecord('company', {
        name: this.proposedCompanyName,
      });
      try {
        await company.save();
        this.flashMessages.success(`Company created: ${company.name}.`);
        this._selectedCompany = company;
        this.args.onSelect?.(company);
      } catch (error) {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to create company.');
        }
      }
    }
  }
}
