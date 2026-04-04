import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';

export default class StatusStepsComponent extends Component {
  get failedStates() {
    return (this.args.failedStates ?? []).map((s) => s.toLowerCase());
  }

  get isFailed() {
    return this.failedStates.includes((this.args.current ?? '').toLowerCase());
  }

  get currentIndex() {
    const current = (this.args.current ?? '').toLowerCase();
    return (this.args.steps ?? []).findIndex((s) => s.toLowerCase() === current);
  }

  get gridStyle() {
    return htmlSafe(
      `grid-template-columns: repeat(${(this.args.steps ?? []).length}, minmax(0, 1fr))`,
    );
  }

  get steps() {
    const steps = this.args.steps ?? [];
    const last = steps.length - 1;

    return steps.map((label, i) => {
      const isLast = i === last;

      // Determine state
      let state;
      if (this.isFailed && isLast) {
        state = 'failed';
      } else if (!this.isFailed && i === this.currentIndex) {
        state = 'active';
      } else if (!this.isFailed && i < this.currentIndex) {
        state = 'done';
      } else {
        state = 'future';
      }

      // Horizontal alignment of the label and circle
      let align, circleAlign;
      if (i === 0) {
        align = 'justify-start';
        circleAlign = 'start-0';
      } else if (isLast) {
        align = 'justify-end';
        circleAlign = 'end-0';
      } else {
        align = 'justify-center';
        circleAlign = 'left-1/2 -translate-x-1/2';
      }

      return { label, state, align, circleAlign };
    });
  }
}
