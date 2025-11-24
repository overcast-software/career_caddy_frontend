import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class CoverLettersNewController extends Controller {
  @service store;
  @service flashMessages;
  @action saveCoverLetter(){
    this.model.save()
        .then(()=> this.flashMessages.success('saved'))
  }
  get companies() {
    return this.store.findAll('company');
  }
}
