import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsFormComponent extends Component {
  @service router;
  @service store;
  @tracked errorMessage = null;
  @tracked form_toggle = false; // false = "by url", true = "manual"
  @tracked companyQuery = '';

  constructor(...args) {
    super(...args);
    // Preload companies so the dropdown has options
    this.store.findAll('company');
  }

  get companies() {
    return this.store.peekAll('company');
  }


  @action
  onModeChange(event) {
    this.form_toggle = event.target.value === 'manual';
  }

  @action
  updateCompanyQuery(event) {
    this.companyQuery = event.target.value;
  }


  @action
  updateField(field, event) {
    this.args.jobPost[field] = event.target.value;
  }
  @action
  updateUrl(event){
    this.url = event.target.value
  }

  @action
  async submitManual(event) {
    event.preventDefault();
    this.errorMessage = null;

    try {
      const name = this.companyQuery?.trim();
      if (!name) {
        this.errorMessage = 'Please enter a company name.';
        return;
      }

      let companyRecord =
        this.companies.find((c) => {
          const label = (c.displayName ?? c.name ?? '').trim().toLowerCase();
          return label === name.toLowerCase();
        }) ?? null;

      if (!companyRecord) {
        companyRecord = this.store.createRecord('company', {
          name,
          displayName: name,
        });
        await companyRecord.save();
      }

      this.args.jobPost.company = companyRecord;

      await this.args.jobPost.save();
      this.router.transitionTo('job-posts.show', this.args.jobPost.id);
    } catch (e) {
      this.errorMessage = e?.errors?.[0]?.detail || e?.message || 'Failed to create job post';
    }
  }
  @action
  async submitScrape(event) {
    event.preventDefault();
    this.errorMessage = null;

    try {
      if ( this.url ) {
        console.log("url", this.url)
        let scrape = this.store.createRecord("scrape", {url: this.url})
        scrape.save()
      }else{
        debugger
      }
    } catch (e) {
      this.errorMessage = e?.errors?.[0]?.detail || e?.message || 'Failed to create job post';
    }
  }
}
