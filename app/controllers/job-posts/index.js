import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobPostsIndexController extends Controller {
  queryParams = [
    'search',
    'hostname',
    'stub',
    'source',
    'scored',
    'bucket',
    { excludeVettedBad: 'exclude_vetted_bad' },
    { includeClosed: 'include_closed' },
  ];

  @tracked search = '';
  @tracked hostname = '';
  @tracked stub = '';
  @tracked source = '';
  @tracked scored = '';
  @tracked bucket = '';
  @tracked excludeVettedBad = '';
  @tracked includeClosed = '';
  @tracked isSearching = false;
  @service flashMessages;

  get filterState() {
    return {
      hostname: this.hostname,
      stub: this.stub,
      source: this.source,
      scored: this.scored,
      bucket: this.bucket,
      excludeVettedBad: this.excludeVettedBad,
      includeClosed: this.includeClosed,
    };
  }

  @action applyFilters(patch) {
    for (const [k, v] of Object.entries(patch)) {
      if (k in this.filterState) this[k] = v ?? '';
    }
  }

  @action clearHostname() {
    this.hostname = '';
  }

  @action clearStub() {
    this.stub = '';
  }

  @action clearSource() {
    this.source = '';
  }

  @action clearScored() {
    this.scored = '';
  }

  @action clearBucket() {
    this.bucket = '';
  }

  @action clearExcludeVettedBad() {
    this.excludeVettedBad = '';
  }

  @action clearIncludeClosed() {
    this.includeClosed = '';
  }

  @action updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }
  @action startSearching() {
    this.isSearching = true;
  }
}
