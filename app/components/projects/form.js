import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ProjectsFormComponent extends Component {
  get project() {
    return this.args.project;
  }

  get formattedStartDate() {
    const d = this.project?.startDate;
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  }

  get formattedEndDate() {
    const d = this.project?.endDate;
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  }

  @action updateField(field, event) {
    if (field === 'startDate' || field === 'endDate') {
      this.project[field] = event.target.valueAsDate ?? null;
    } else if (field === 'isActive') {
      this.project[field] = event.target.checked;
    } else {
      this.project[field] = event.target.value;
    }
  }
}
