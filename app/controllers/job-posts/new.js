import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class JobPostsNewController extends Controller {
  @service store;
  @service flashMessages;
  @service router;

  @tracked selectedCompany = null;

  @action
  async searchCompanies(term) {
    const params = term ? { 'filter[query]': term } : {};
    const results = await this.store.query('company', params);
    return results.slice();
  }

  @action
  updateField(field, event) {
    this.model[field] = event.target.value;
  }

  @action updateCompany(company) {
    this.model.company = company;
    this.selectedCompany = company;
  }

  @action async submitDelete() {
    try {
      await this.model.destroyRecord();
      this.flashMessages.success('Job post deleted.');
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to delete job post.');
      }
    }
  }

  @action async addCompanyToJobPost(companyName) {
    const company = this.store.createRecord('company', { name: companyName });
    try {
      await company.save();
      this.selectedCompany = company;
      this.model.company = company;
      this.flashMessages.success('Company created: ' + company.name + '.');
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to create company.');
      }
    }
  }

  @action async submitJobPost(event) {
    event.preventDefault();
    try {
      const record = await this.model.save();
      this.flashMessages.success('Job post saved.');
      this.router.transitionTo('job-posts.show.job-applications', record);
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to save job post.');
      }
    }
  }

  @action async createAndApply(event) {
    event.preventDefault();
    try {
      const record = await this.model.save();
      this.router.transitionTo('job-posts.show.job-applications.new', record);
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to save job post.');
      }
    }
  }

  @action async createAndScore(event) {
    event.preventDefault();
    try {
      const record = await this.model.save();
      this.router.transitionTo('job-posts.show.scores', record);
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to save job post.');
      }
    }
  }
}
