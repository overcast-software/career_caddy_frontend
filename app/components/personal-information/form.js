import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PersonalInformationForm extends Component {
  get user() {
    return this.args.user;
  }

  @action
  updateAttr(attr, valueOrEvent) {
    if (!this.user) return;
    let value;
    if (valueOrEvent && valueOrEvent.target) {
      const { type, checked, value: inputValue } = valueOrEvent.target;
      value = type === 'checkbox' ? !!checked : inputValue;
    } else {
      value = valueOrEvent;
    }
    // Prefer Ember Data's setter if available; fallback to direct assignment
    this.user.set?.(attr, value);
    if (!this.user.set) {
      this.user[attr] = value;
    }
  }

  @action
  handleChange(event) {
    const attr = event?.target?.name;
    if (!attr) return;
    this.updateAttr(attr, event);
  }
}
