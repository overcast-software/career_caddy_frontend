import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesNewRoute extends Route {
  @service store;

  async model(_, transition) {
    let { clone_from } = transition?.to?.queryParams ?? {};
    if (!clone_from) clone_from = 16;

    const toArray = (rel) => rel?.toArray?.() ?? Array.from(rel ?? []);

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
    for (const edu of toArray(await source.educations)) {
      const newEdu = this.store.createRecord('education', {
        degree: edu.degree,
        issueDate: edu.issueDate,
        institution: edu.institution,
        major: edu.major,
        minor: edu.minor,
        resume: newResume,
      });
      const relEdu = await newResume.educations;
      if (!relEdu.includes(newEdu)) relEdu.pushObject(newEdu);
    }

    // Clone certifications (UNSAVED)
    for (const cert of toArray(await source.certifications)) {
      const newCert = this.store.createRecord('certification', {
        issuer: cert.issuer,
        title: cert.title,
        content: cert.content,
        issueDate: cert.issueDate,
        resume: newResume,
      });
      const relCert = await newResume.certifications;
      if (!relCert.includes(newCert)) relCert.pushObject(newCert);
    }

    // Clone summaries (UNSAVED)
    for (const sum of toArray(source.summaries)) {
      const newSum = this.store.createRecord('summary', {
        content: sum.content,
        user: sum.user,
        jobPost: sum.jobPost,
        resume: newResume,
      });
      const relSum = await newResume.summaries;
      if (!relSum.includes(newSum)) relSum.pushObject(newSum);
    }

    // Clone experiences and their descriptions (UNSAVED)
    for (const exp of toArray(await source.experiences)) {
      await exp.hasMany?.('descriptions')?.load?.();
      await exp.belongsTo?.('company')?.reload?.();

      const newExp = this.store.createRecord('experience', {
        location: exp.location,
        title: exp.title,
        content: exp.content,
        startDate: exp.startDate,
        endDate: exp.endDate,
        resume: newResume,
        company: await exp.company,
        clonedId: exp.id,
      });
      const relExp = await newResume.experiences;
      if (!relExp.includes(newExp)) relExp.pushObject(newExp);

      for (const d of toArray(await exp.descriptions)) {
        const newDesc = this.store.createRecord('description', {
          content: d.content,
          order: d.order,
          experience: newExp,
        });
        const relDesc = await newExp.descriptions;
        if (!relDesc.includes(newDesc)) relDesc.pushObject(newDesc);
      }
    }

    return newResume; // UNSAVED until user explicitly saves
  }
}
