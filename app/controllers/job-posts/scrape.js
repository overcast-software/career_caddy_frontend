import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobPostsScrapeController extends Controller {
  @service store

  @action
  updateUrl(event){
    this.url = event.target.value
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
