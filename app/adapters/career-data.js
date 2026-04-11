import ApplicationAdapter from './application';

export default class CareerDataAdapter extends ApplicationAdapter {
  urlForQueryRecord() {
    return `${this.buildURL()}career-data`;
  }
}
