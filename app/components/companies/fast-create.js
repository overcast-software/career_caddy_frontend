import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class CompaniesFastCreate extends Component {
  @service store;
  @service flashMessages;
  companyName = '';

  @action handleNameChange(event) {
    this.companyName = event.target.value;
  }

  @action async handleClick() {
    if (this.args.customSubmit) {
      this.args.customSubmit();
    } else {
      try {
        const company = await this.store
          .createRecord('company', { name: this.companyName })
          .save();
        this.flashMessages.success(`Company created: ${company.name}.`);
      } catch (error) {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to create company.');
        }
      }
    }
  }
}
