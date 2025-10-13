import ApplicationSerializer from './application';

export default class ExperienceSerializer extends ApplicationSerializer {
      attrs = {
          descriptions: {serialize: true, embedded: 'always'}
      }

    normalize(typeClass, hash) {
        if (hash.descriptions) {
            hash.descriptions = this.store.normalize('description', hash.descriptions)
        }
        return super.normalize(typeClass, hash)
    }
}
