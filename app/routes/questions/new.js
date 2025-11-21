import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class QuestionsNewRoute extends Route {
  @service store;

  async model(_params, transition) {
    const { companyId } = transition.to.queryParams;
    if (companyId){

    this.store.findRecord('company', companyId, {
      include: 'job-post',
    });
    }else{
      this.store.findAll('company', {include: 'job-post'})
    }
    this.store.findAll('job-application')
    const question = this.store.createRecord('question');
    return question
  }
}
