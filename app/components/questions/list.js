import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
export default class QuestionsList extends Component {
  @service store;
  @tracked selectedCompany;
  @action updateCompany(company) {
    this.selectedCompany = company;
  }

  get companies() {
    return this.store.peekAll('company');
  }

  get companyQuestions() {
    //return all the questions a company asked in their job posts
    if (this.selectedCompany) {
      return this.selectedCompany.questions
    } else {
      return this.args.questions
    }
  }
}
