import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesEditRoute extends Route {
  @service store;

  async model({ resume_id }) {
    const [resume] = await Promise.all([
      this.store.findRecord('resume', resume_id),
      this.store.findAll('summary'),
    ]);
    await Promise.all([resume.skills, resume.summaries, resume.projects]);
    return resume;
  }
}
