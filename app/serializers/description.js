import ApplicationSerializer from './application';

export default class DescriptionSerializer extends ApplicationSerializer {
  // keyForAttribute(key) {
  //   if (key === 'content') return 'text'; // serialize content as text
  //   return super.keyForAttribute(key);
  // }

  // normalize(modelClass, resourceHash, prop) {
  //   const attrs = resourceHash?.attributes;
  //   if (attrs?.text != null && attrs.content == null) {
  //     attrs.content = attrs.text; // accept text from API as content
  //   }
  //   return super.normalize(modelClass, resourceHash, prop);
  // }
}
