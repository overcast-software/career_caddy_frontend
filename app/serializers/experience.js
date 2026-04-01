import ApplicationSerializer from './application';

export default class ExperienceSerializer extends ApplicationSerializer {
  normalize(typeClass, hash) {
    // XXX did not need this -fixed on back end
    // API returns data:[] for descriptions even when unloaded.
    // Remove the empty data so Ember Data follows the related link instead.
    // const descriptionsRel = hash.relationships?.descriptions;
    // if (
    //   descriptionsRel &&
    //   Array.isArray(descriptionsRel.data) &&
    //   descriptionsRel.data.length === 0 &&
    //   descriptionsRel.links?.related
    // ) {
    //   delete descriptionsRel.data;
    // }
    return super.normalize(typeClass, hash);
  }
}
