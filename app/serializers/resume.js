import ApplicationSerializer from './application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
// import EmberInflector from 'ember-inflector';
// const inflector = EmberInflector.inflector;


import JSONAPISerializer from '@ember-data/serializer/json-api';


export default class ResumeSerializer extends JSONAPISerializer.extend(EmbeddedRecordsMixin) {
  attrs = {
      user: { serialize: true, embedded: 'always' },
      scores: { serialize: true, embedded: 'always' },
      coverLetters: { serialize: true, embedded: 'always' },
      applications: { serialize: true, embedded: 'always' },
      experiences: { serialize: true, embedded: 'always' },
      educations: { serialize: true, embedded: 'always' },
      summaries: { serialize: true, embedded: 'always' },
      certifications: { serialize: true, embedded: 'always' }
  };

  isEmbeddedRecordsMixinCompatible= true

  normalize(typeClass, hash) {
    if (hash.summary) {
      hash.summary = this.store.normalize('summary', hash.summary);
    }
    if (hash.education) {
      hash.education = this.store.normalize('education', hash.education);
    }
    if (hash.certification) {
      hash.certification = this.store.normalize('certification', hash.certification);
    }
    if (hash.experiences) {
      hash.experiences = this.store.normalize('experience', hash.experiences );
    }
   return super.normalize(typeClass, hash);
  }

}
