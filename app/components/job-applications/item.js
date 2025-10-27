import Component from '@glimmer/component';
// import { tracked } from '@glimmer/tracking';

export default class JobApplicationsItem extends Component {
  saveApplication(){}

  get application(){
    return this.args.application
  }
}
