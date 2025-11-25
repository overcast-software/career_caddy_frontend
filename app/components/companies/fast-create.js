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

  @action handleClick() {
    if (this.args.customSubmit) {
      this.args.customSubmit();
    } else {
      this.store.createRecord('company', {name: this.companyName})
          .save()
          .then((company)=> this.flashMessages.success(`created company: ${company.name}`))
    }
  }
}
