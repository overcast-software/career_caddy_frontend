import JSONAPISerializer from '@ember-data/serializer/json-api';
import { singularize } from 'ember-inflector';

export default class ApplicationSerializer extends JSONAPISerializer {
  modelNameFromPayloadType(payloadType) {
    // accept plural/singular and underscores from the API, normalize to model names
    if (!payloadType) return payloadType;
    return singularize(payloadType.replace(/_/g, '-'));
  }
}
