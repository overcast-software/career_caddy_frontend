import Component from '@glimmer/component';
import { service } from '@ember/service';

const STEPS = [
  { key: 'profession', label: 'Profession' },
  { key: 'resume', label: 'Resume' },
  { key: 'review', label: 'Review' },
  { key: 'score', label: 'Sample score' },
];

export default class WizardStepperComponent extends Component {
  @service currentUser;

  get steps() {
    const isStaff = Boolean(this.currentUser.user?.isStaff);
    const filtered = isStaff ? STEPS : STEPS.filter((s) => s.key !== 'score');

    const current = this.args.currentStep;
    const currentIndex = filtered.findIndex((s) => s.key === current);

    return filtered.map((step, index) => ({
      ...step,
      number: index + 1,
      isCurrent: step.key === current,
      isComplete: currentIndex > -1 && index < currentIndex,
      isLast: index === filtered.length - 1,
    }));
  }
}
