import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
export default class QuestionsIndexController extends Controller {
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
      return this.selectedCompany.questions;
    } else {
      return this.store.peekAll('question');
    }
  }
}
