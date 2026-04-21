import Component from '@glimmer/component';

export default class CareerDataSectionedViewComponent extends Component {
  get sections() {
    return this.args.sections || [];
  }
}
