import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { toCalendarString } from 'career-caddy-frontend/utils/tz';

export default class EducationsFormComponent extends Component {
  @tracked errorMessage = null;

  get education() {
    return this.args.education ?? this.args.model;
  }

  get formattedIssueDate() {
    return toCalendarString(this.education?.issueDate);
  }

  @action updateField(field, event) {
    if (field === 'issueDate') {
      this.education[field] = event.target.value || null;
    } else {
      this.education[field] = event.target.value;
    }
  }
}
