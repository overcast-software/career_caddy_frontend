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
  ];

  @tracked search = '';
  @tracked hostname = '';
  @tracked stub = '';
  @tracked source = '';
  @tracked scored = '';
  @tracked bucket = '';
  @tracked isSearching = false;
  @service flashMessages;

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

  @action hideStubs() {
    this.stub = 'false';
  }

  @action updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }
  @action startSearching() {
    this.isSearching = true;
  }
}
