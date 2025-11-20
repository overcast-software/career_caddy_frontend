import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class QuestionsFormComponent extends Component {
  @tracked errorMessage = null;

  get selectedCompanyId() {
    try {
      return this.args.question?.belongsTo?.('company')?.id?.() ?? '';
    } catch {
      return '';
    }
  }

  get selectedJobApplicationId() {
    try {
      return this.args.question?.belongsTo?.('jobApplication')?.id?.() ?? '';
    } catch {
      return '';
    }
  }

  @action updateContent(event) {
    this.args.question.content = event.target.value;
  }

  @action updateCompany(event) {
    const id = event.target.value || null;
    if (!id) {
      this.args.question.belongsTo('company').set(null);
      return;
    }
    const company =
      this.args.companies?.findBy?.('id', id) ||
      this.args.companies?.find?.((c) => c.id === id) ||
      null;
    this.args.question.belongsTo('company').set(company);
  }

  @action updateJobApplication(event) {
    const id = event.target.value || null;
    if (!id) {
      this.args.question.belongsTo('jobApplication').set(null);
      return;
    }
    const ja =
      this.args.jobApplications?.findBy?.('id', id) ||
      this.args.jobApplications?.find?.((j) => j.id === id) ||
      null;
    this.args.question.belongsTo('jobApplication').set(ja);
  }

  @action async save(event) {
    event?.preventDefault();
    this.errorMessage = null;
    try {
      await this.args.question.save();
      this.args.onSave?.(this.args.question);
    } catch (e) {
      this.errorMessage =
        e?.errors?.[0]?.detail || e?.message || 'Failed to save question';
    }
  }

  @action cancel(event) {
    event?.preventDefault();
    this.args.question.rollbackAttributes?.();
    this.args.onCancel?.();
  }
}
