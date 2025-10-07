import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ResumesItemComponent extends Component {
  @service router;
  @service store;

  isEditingExperience(experience) {
    // Add your logic here to determine if an experience is being edited
    return false;
  }

  @action
  async submitResume() {
    try {
      const source = this.args.resume;
      const toArray = (rel) => rel?.toArray?.() ?? Array.from(rel ?? []);

      // Ensure children are loaded from the source
      await source.hasMany?.('experiences')?.load?.();
      await source.hasMany?.('educations')?.load?.();
      await source.hasMany?.('certifications')?.load?.();
      // Summary may be a belongsTo; load gracefully if available
      if (source.belongsTo?.('summary')?.load) {
        await source.belongsTo('summary').load();
      }

      // 1) Create and save the new resume to obtain its ID
      const newResume = this.store.createRecord('resume', {
        title: source.title,
        user: source.user
      });
      await newResume.save();

      // 2) Clone children, associating them to the new resume before saving
      const experienceClones = toArray(source.experiences).map(async (exp) => {
        // Create experience associated to the new resume
        const newExp = this.store.createRecord('experience', {
          title: exp.title,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          clonedId: exp.id,
          resume: newResume,
          company: exp.company
        });
        await newExp.save();

        // Load and clone descriptions
        await exp.hasMany?.('descriptions')?.load?.();
        const descs = toArray(exp.descriptions);
        if (descs.length) {
          await Promise.all(
            descs.map((d) =>
              this.store
                .createRecord('description', {
                  content: d.content,
                  order: d.order,
                  experience: newExp
                })
                .save()
            )
          );
        }
      });

      const educationClones = toArray(source.educations).map((ed) =>
        this.store
          .createRecord('education', {
            degree: ed.degree,
            issueDate: ed.issueDate,
            institution: ed.institution,
            major: ed.major,
            minor: ed.minor,
            resume: newResume
          })
          .save()
      );

      const certificationClones = toArray(source.certifications).map((c) =>
        this.store
          .createRecord('certification', {
            issuer: c.issuer,
            title: c.title,
            content: c.content,
            issueDate: c.issueDate,
            resume: newResume
          })
          .save()
      );

      // Clone summary if present
      let summaryClone = null;
      const sourceSummary = source.summary ?? source.belongsTo?.('summary')?.value?.();
      if (sourceSummary?.content) {
        summaryClone = this.store
          .createRecord('summary', {
            content: sourceSummary.content,
            resume: newResume,
            user: sourceSummary.user,
            jobPost: sourceSummary.jobPost
          })
          .save();
      }

      // 3) Wait for all child creates to complete
      await Promise.all([
        ...experienceClones,
        ...educationClones,
        ...certificationClones,
        summaryClone
      ].filter(Boolean));

      // 4) Redirect to the newly created resume
      this.router.transitionTo('resumes.show', newResume.id);
    } catch (e) {
      // Optional: surface an error state as needed
       
      console.error('Failed to clone resume', e);
      alert?.('Failed to clone resume.');
    }
  }
}
