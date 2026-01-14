import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
export default class QuestionsIndexController extends Controller {
  @service store;
  @service flashMessages;
  @tracked selectedCompany;
  
  @action updateCompany(company) {
    this.selectedCompany = company;
  }

  @action async toggleFavorite(question) {
    question.favorite = !question.favorite;
    try {
      await question.save();
      const status = question.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Question ${status} favorites`);
    } catch (error) {
      question.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status');
    }
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
