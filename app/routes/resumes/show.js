import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesShowRoute extends Route {
  @service store;

  async model({ resume_id }) {
    const resume = await this.store.findRecord('resume', resume_id);
    await resume.hasMany('experiences').load();
    await resume.hasMany('educations').load();
    await resume.hasMany('certifications').load();
    await resume.hasMany('summaries').load();
    await resume.hasMany('experiences').load();
    return resume;
  }
}
