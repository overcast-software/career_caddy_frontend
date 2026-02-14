import Transform from '@ember-data/serializer/transform';
import { typeOf } from '@ember/utils';

export default class ArrayTransform extends Transform {
  deserialize(serialized) {
    return (typeOf(serialized) === "array") ? serialized : [];
  }

  serialize(deserialized) {
    const type = typeOf(deserialized);
    if (type === 'array') {
      return deserialized;
    } else if (type === 'string') {
      return deserialized.split(',').map(function(item) {
        return item.trim();
      });
    } else {
      return [];
    }
  }
}
