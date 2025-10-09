import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesNewRoute extends Route {
  @service store;

  async model(_, transition) {
    let { clone_from } = transition?.to?.queryParams ?? {};
    if (!clone_from) clone_from = 1;


    await this.store.findAll("company")
    await this.store.findAll("description")

    // Load source and eagerly load its relationships
    const source = await this.store.findRecord('resume', clone_from);
    const exp = await source.hasMany?.('experiences')?.load?.();
    const edu = await source.hasMany?.('educations')?.load?.();
    const cert = await source.hasMany?.('certifications')?.load?.();
    const sum = await source.hasMany?.('summaries')?.load?.();

    // Create UNSAVED cloned resume
    const newResume = this.store.createRecord('resume', {
      content: source.content,
      filePath: source.filePath,
      title: source.title + " cloned",
      user: source.user,
      experiences: exp,
      educations: edu,
      certifications: cert,
      summaries: sum
    });

    return newResume; // UNSAVED until user explicitly saves
  }
}
