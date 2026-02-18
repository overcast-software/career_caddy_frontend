import ApplicationAdapter from './application';

export default class CareerDataAdapter extends ApplicationAdapter {
  urlForQueryRecord(query, modelName) {
    return `${this.buildURL()}/career-data`;
  }
}
