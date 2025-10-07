import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class CertificationsFormComponent extends Component {
  @tracked errorMessage = null;

  get certification() {
    return this.args.certification ?? this.args.model;
  }

  get formattedIssueDate() {
    const d = this.certification?.issueDate;
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  }

  @action updateField(field, event) {
    if (field === 'issueDate') {
      this.certification[field] = event.target.valueAsDate ?? null;
    } else {
      this.certification[field] = event.target.value;
    }
  }
}
