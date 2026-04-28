import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

const SOURCES = ['manual', 'email', 'paste', 'scrape', 'chat', 'import'];

export default class JobPostsFiltersMenuComponent extends Component {
  @service router;

  @tracked open = false;

  get sources() {
    return SOURCES;
  }

  get activeCount() {
    const f = this.args.filters || {};
    let n = 0;
    if (f.excludeVettedBad) n++;
    if (f.stub) n++;
    if (f.scored) n++;
    if (f.source) n++;
    if (f.hostname) n++;
    if (f.bucket) n++;
    if (f.includeClosed) n++;
    return n;
  }

  @action toggle() {
    this.open = !this.open;
  }

  @action close() {
    this.open = false;
  }

  @action setExcludeVettedBad(event) {
    this.args.onChange?.({
      excludeVettedBad: event.target.checked ? 'true' : '',
    });
  }

  @action setIncludeClosed(event) {
    this.args.onChange?.({
      includeClosed: event.target.checked ? 'true' : '',
    });
  }

  @action setStub(value) {
    this.args.onChange?.({ stub: value });
  }

  @action setScored(value) {
    this.args.onChange?.({ scored: value });
  }

  @action setSource(event) {
    this.args.onChange?.({ source: event.target.value });
  }

  @action clearAll() {
    this.args.onChange?.({
      excludeVettedBad: '',
      stub: '',
      scored: '',
      source: '',
      hostname: '',
      bucket: '',
      includeClosed: '',
    });
  }
}
