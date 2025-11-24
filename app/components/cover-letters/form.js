import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class CoverLettersForm extends Component {
  @service store;
  @action updateContent(event){
    this.args.coverLetter.content = event.target.value
  }
}
