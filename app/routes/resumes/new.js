import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesNewRoute extends Route {
  @service store;

  async model(_, transition) {
    let { clone_from } = transition?.to?.queryParams ?? {};
    if (!clone_from) clone_from = 1;


    await this.store.findAll("company")
    // Load source and eagerly load its relationships
    const source = await this.store.findRecord('resume', clone_from);
    await source.hasMany?.('experiences')?.load?.();
    await source.hasMany?.('educations')?.load?.();
    await source.hasMany?.('certifications')?.load?.();
    await source.hasMany?.('summaries')?.load?.();

    // Create UNSAVED cloned resume
    const newResume = this.store.createRecord('resume', {
      content: source.content,
      filePath: source.filePath,
      title: source.title,
      user: source.user,
    });

    // Clone educations (UNSAVED) and push to relationship
    await source.educations.forEach((edu) =>
        this.store.createRecord('education', {
            degree: edu.degree,
            issueDate: edu.issueDate,
            institution: edu.institution,
            major: edu.major,
            minor: edu.minor,
            resume: newResume
        })
    )

    // Clone certifications (UNSAVED)
    await source.certifications.forEach((cert) => 
        this.store.createRecord('certification', {
            issuer: cert.issuer,
            title: cert.title,
            content: cert.content,
            issueDate: cert.issueDate,
            resume: newResume,
        })
    )

    // Clone summaries (UNSAVED)
    await source.summaries.forEach((sum) =>
      this.store.createRecord('summary', {
        content: sum.content,
        user: sum.user,
        jobPost: sum.jobPost,
        resume: newResume,
      })
    )

    // Clone experiences and their descriptions (UNSAVED)
    source.experiences.forEach(async (exp) => {
        const company = await this.store.peekRecord("company", exp.company.id)

        const clonedExp = this.store.createRecord('experience', {
            location: exp.location,
            title: exp.title,
            content: exp.content,
            startDate: exp.startDate,
            endDate: exp.endDate,
            resume: newResume,
            company: company,
            clonedId: exp.id,
        });

        exp.descriptions.forEach((d)=>
            this.store.createRecord('description', {
            content: d.content,
            order: d.order,
            experience: clonedExp,
        })
        )
    })

    return newResume; // UNSAVED until user explicitly saves
  }
}
