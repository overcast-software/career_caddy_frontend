import JSONAPISerializer from '@ember-data/serializer/json-api';
import { singularize } from 'ember-inflector';

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
    if (normalized === 'experience-description') return 'description';
    return normalized;
  }

  keyForAttribute(attr) {
    return toSnakeCase(attr);
  }

  keyForRelationship(key) {
    return toSnakeCase(key);
  }

  serializeAttribute(snapshot, json, key, attribute) {
    super.serializeAttribute(snapshot, json, key, attribute);
    if (attribute.type === 'date') {
      const attrs = json?.data?.attributes;
      if (!attrs) return;
      const serializedKey = this.keyForAttribute(key);
      const val = attrs[serializedKey];
      if (val) {
        attrs[serializedKey] =
          typeof val === 'string'
            ? val.slice(0, 10)
            : new Date(val).toISOString().slice(0, 10);
      }
    }
  }
}
