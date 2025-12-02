import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { registerDestructor } from '@ember/destroyable';

export default class SpinnerIndicatorComponent extends Component {
  @service spinner;
  @tracked currentIndex = 0;

  constructor() {
    super(...arguments);
    
    this._intervalId = setInterval(() => {
      if (this.spinner.isShowing && this.displayWord.length > 0) {
        this.currentIndex = (this.currentIndex + 1) % this.displayWord.length;
      } else {
        this.currentIndex = 0;
      }
    }, 250);

    registerDestructor(this, () => {
      clearInterval(this._intervalId);
    });
  }

  get displayWord() {
    return (this.args.word ?? this.spinner.label ?? '').toString();
  }

  get letters() {
    return Array.from(this.displayWord).map((ch, idx) => ({
      ch,
      active: idx === this.currentIndex
    }));
  }
}
