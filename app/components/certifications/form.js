import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { toCalendarString } from 'career-caddy-frontend/utils/tz';

export default class CertificationsFormComponent extends Component {
  @tracked errorMessage = null;

  get certification() {
    return this.args.certification ?? this.args.model;
  }

  // issueDate on the model is a calendar string "YYYY-MM-DD" (DateField).
  // <input type="date"> accepts that string directly — no Date conversion.
  get formattedIssueDate() {
    return toCalendarString(this.certification?.issueDate);
  }

  @action updateField(field, event) {
    if (field === 'issueDate') {
      // event.target.value is already "YYYY-MM-DD"; bypass valueAsDate to
      // skip the UTC-midnight Date conversion that PST-shifts.
      this.certification[field] = event.target.value || null;
    } else {
      this.certification[field] = event.target.value;
    }
  }
}
