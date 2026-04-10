import Component from '@glimmer/component';

export default class StatusStepsComponent extends Component {
  get failedStates() {
    return (this.args.failedStates ?? []).map((s) => s.toLowerCase());
  }

  get isFailed() {
    return this.failedStates.includes((this.args.current ?? '').toLowerCase());
  }

  get currentIndex() {
    const current = (this.args.current ?? '').toLowerCase();
    return (this.args.steps ?? []).findIndex(
      (s) => s.toLowerCase() === current,
    );
  }

  get steps() {
    const steps = this.args.steps ?? [];
    const last = steps.length - 1;

    // Build states first so we can reference neighbours for line colors
    const states = steps.map((_, i) => {
      if (this.isFailed && i === last) return 'failed';
      if (!this.isFailed && i === this.currentIndex) return 'active';
      if (!this.isFailed && i < this.currentIndex) return 'done';
      return 'future';
    });

    return steps.map((label, i) => {
      const state = states[i];
      const isFirst = i === 0;
      const isLast = i === last;

      // Line segment AFTER this step is "done" if both this and next are reached
      const reached = (s) => s === 'done' || s === 'active' || s === 'failed';
      const lineAfterDone =
        !isLast && reached(states[i]) && reached(states[i + 1]);
      const lineBeforeDone =
        !isFirst && reached(states[i - 1]) && reached(states[i]);

      return {
        label,
        state,
        number: i + 1,
        isFirst,
        isLast,
        lineAfterDone,
        lineBeforeDone,
      };
    });
  }
}
