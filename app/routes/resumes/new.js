import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesNewRoute extends Route {
  @service store;

  async model(_, transition) {
    let { clone_from } = transition?.to?.queryParams ?? {};
    if (!clone_from) clone_from = 1;


    // Load source and eagerly load its relationships
    const source = await this.store.findRecord('resume', clone_from,
                                               { include: 'experiences,educations,certification,summaries'}
                                              );

      await this.store.findAll('company')
    // Create UNSAVED cloned resume
    const newResume = this.store.createRecord('resume', {
        content: source.content,
        filePath: source.filePath,
        title: source.title + " cloned",
        user: source.user,
        experiences: await source.experiences,
        educations: await source.educations,
        certifications: await source.certifications,
        summaries: await source.summaries
    });

    return newResume; // UNSAVED until user explicitly saves
  }
}
