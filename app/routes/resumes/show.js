import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesShowRoute extends Route {
  @service store;

  model({ resume_id }) {
    return this.store.findRecord('resume', resume_id);
  }

  async afterModel(resume) {
    const full = await this.store.findRecord('resume', resume.id, {
      reload: true,
    });
    await Promise.all([
      full.skills,
      full.summaries,
      full.experiences,
      full.educations,
      full.certifications,
      full.projects,
    ]);
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.model = this.store.peekRecord('resume', model.id);
  }
}
