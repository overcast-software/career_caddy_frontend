import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
export default class CompaniesSelectOrCreate extends Component {
  @tracked showCreate = false;
  @action toggleCreateForm() {
    this.showCreate = !this.showCreate
    console.log(this.showCreate)
  }

  get companyAndCreate(){
    return this.args.companies
  }
}
