import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ResumesNewController extends Controller {
  @service store;
  @service router;

  toArray = (rel) => rel?.toArray?.() ?? Array.from(rel ?? []);

  addExperience = async () => {
    const exp = this.store.createRecord('experience', { resume: this.model });
    const rel = await this.model.experiences;
    if (!rel.includes(exp)) rel.pushObject(exp);
  };

  saveAll = async () => {
    // Save resume to obtain id first
    if (this.model.isNew) {
      await this.model.save();
    }
    // Save experiences and their descriptions
    for (const exp of this.toArray(await this.model.experiences)) {
      if (!exp.belongsTo('resume').id()) exp.resume = this.model;
      if (exp.isNew || exp.hasDirtyAttributes) await exp.save();
      const descs = await exp.descriptions;
      for (const d of this.toArray(descs)) {
        if (!d.belongsTo('experience').id()) d.experience = exp;
        if (d.isNew || d.hasDirtyAttributes) await d.save();
      }
    }
    // Save other child records if needed (educations, certifications, summaries)
    for (const edu of this.toArray(await this.model.educations)) {
      if (!edu.belongsTo('resume').id()) edu.resume = this.model;
      if (edu.isNew || edu.hasDirtyAttributes) await edu.save();
    }
    for (const cert of this.toArray(await this.model.certifications)) {
      if (!cert.belongsTo('resume').id()) cert.resume = this.model;
      if (cert.isNew || cert.hasDirtyAttributes) await cert.save();
    }
    for (const sum of this.toArray(await this.model.summaries)) {
      if (!sum.belongsTo('resume').id()) sum.resume = this.model;
      if (sum.isNew || sum.hasDirtyAttributes) await sum.save();
    }

    this.router.transitionTo('resumes.show', this.model.id);
  };
}
