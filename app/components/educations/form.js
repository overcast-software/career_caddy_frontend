import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class EducationsFormComponent extends Component {
  @tracked errorMessage = null;

  get education() {
    return this.args.education ?? this.args.model;
  }

  get formattedIssueDate() {
    const d = this.education?.issueDate;
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  }

  @action updateField(field, event) {
    if (field === 'issueDate') {
      this.education[field] = event.target.valueAsDate ?? null;
    } else {
      this.education[field] = event.target.value;
    }
  }
}
