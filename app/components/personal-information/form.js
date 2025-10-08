import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PersonalInformationForm extends Component {
    get user() {
        return this.args.user;
    }
    @action
    updateName(event){
        this.user.name = event.target.value;
    }
    @action
    updatePhone(event){
        this.user.phone = event.target.value;
    }
    @action
    updateEmail(event){
        this.user.email = event.target.value;
    }
}
