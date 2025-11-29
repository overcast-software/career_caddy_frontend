import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class CoverLettersForm extends Component {
  @service store;
  @service flashMessages;
  @service router;
  @action updateContent(event){
    this.args.coverLetter.content = event.target.value
  }
  @action saveCoverLetter(event){
    event.preventDefault()
    this.args.coverLetter.save()
        .then(()=> this.flashMessages.success('Cover letter saved.'))
        .then(()=> this.router.transitionTo('cover-letters.show', this.args.coverLetter.id))
    
  }
}
