import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ResumesShowController extends Controller {
  @service store;
  @service router;

  @action
  async cloneResume() {
    const source = this.model;
    if (!source) return;

    // Minimal clone: copy top-level fields; keep user association
    const newResume = this.store.createRecord('resume', {
      content: source.content,
      filePath: source.filePath,
      title: `${source.title} cloned`,
      user: source.user
    });

    await newResume.save();
    this.router.transitionTo('resumes.show', newResume.id);
  }
}
