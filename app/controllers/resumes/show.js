import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ResumesShowController extends Controller {
  @service store;
  @service router;

  @action
  async cloneResume() {
    const source = this.model;

    // Create a shallow clone (without children) to avoid passing ManyArrays/PromiseManyArrays
    this.store.createRecord('resume', {
      title: source.title ? `${source.title} (Copy)` : source.title,
      content: source.content ?? null,
      filePath: source.filePath ?? null,
    })
    .save()
    .then( (c) => {
        console.info(c.id)
        return Promise.all([
            c.experiences,
            c.certifications,
            c.educations,
            c.summaries,
        ]).then(([experiences, certifications, educations, summaries]) => {
            source.experiences.forEach( (exp) => experiences.push(exp))
            source.certifications.forEach( (cert) => certifications.push(cert))
            source.educations.forEach( (edu) => educations.push(edu))
            source.summaries.forEach( (sum) => summaries.push(sum))
            return c.save()
        })
    })
    .then( (c) => {
        this.router.transitionTo('resumes.show', c.id)
    })
    }
}
