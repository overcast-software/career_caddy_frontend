import Component from '@glimmer/component';

export default class SummariesForm extends Component {
  get isActive() {
    return !!this.args.summary?.active;
  }

  get html() {
    return this.args.summary?.content ?? '';
  }
}
