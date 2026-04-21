import JSONAPISerializer from '@ember-data/serializer/json-api';
import { singularize } from 'ember-inflector';
import { toCalendarString } from 'career-caddy-frontend/utils/tz';

const toSnakeCase = (s) =>
  s
    ?.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();

// export default class ApplicationSerializer extends JSONAPISerializer.extend(EmbeddedRecordsMixin) {
export default class ApplicationSerializer extends JSONAPISerializer {
  modelNameFromPayloadType(payloadType) {
    if (!payloadType) return payloadType;
    const normalized = singularize(payloadType.replace(/_/g, '-'));
    return normalized;
  }

  keyForAttribute(attr) {
    return toSnakeCase(attr);
  }

  normalize(modelClass, resourceHash) {
    if (resourceHash.meta) {
      resourceHash.attributes = resourceHash.attributes || {};
      Object.assign(resourceHash.attributes, resourceHash.meta);
    }
    return super.normalize(modelClass, resourceHash);
  }

  serializeAttribute(snapshot, json, key, attribute) {
    super.serializeAttribute(snapshot, json, key, attribute);
    if (attribute.type === 'date') {
      const attrs = json?.data?.attributes;
      if (!attrs) return;
      const serializedKey = this.keyForAttribute(key);
      const val = attrs[serializedKey];
      if (val) {
        // Never .toISOString() here — that UTC-shifts local-midnight Dates
        // and drops PST dates to the previous day. toCalendarString reads
        // the local date parts directly for Date inputs, or slices strings.
        attrs[serializedKey] = toCalendarString(val);
      }
    }
  }
}
