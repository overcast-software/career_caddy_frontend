import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
export default class ResumesItemComponent extends Component {
  @service router;
  @service store;

  @action
  async submitResume() {
        const source = this.args.resume; //new resume clone
        await source.save().then(async (resume) => {
            await Promise.all(
                this.store.peekAll('experience').forEach(async (exp) => {
                    if (exp.hasDirtyAttributes){
                        console.warm('dirty')
                        exp = await this.store.createRecord('experience',{
                            location: exp.location,
                            title: exp.title,
                            summary: exp.summary,
                            startDate: exp.startDate,
                            endDate: exp.endDate,
                            resume: resume,
                            company: exp.company
                        })
                    } else{
                        console.log('not dirty')
                        exp.resume = resume;
                    }
                    //exp needs to know which resume
                    //TODO need to validate this api call it's a PATCH
                    await exp.save().then(async (e) => {
                        // this.store.peekAll('description').forEach((d) => {
                            // if (d.belongsTo('experience').id() === e.id){
                            //     d.experience = e

                            //     debugger
                            //     d.save()
                            //     // let attrs = d.serialize().data.attributes
                            //     // attrs.experience = e.id
                            //     // payload.descriptions.push(attrs)
                            // }
                            // Your logic with descriptions here
                        // });
                    });
                })
            );
        })

        source.certifications.forEach(async (cert) =>
            this.store
            .createRecord('certification', {
                issuer: cert.issuer,
                title: cert.title,
                content: cert.content,
                issueDate: cert.issueDate,
                resume: source
            })
            .save()
        );

        // Clone summary if present
        source.summaries.forEach((s) =>
            this.store
            .createRecord('summary', {
                content: s.content,
                user: s.user,
                jobPost: s.jobPost,
                resume: source
            })
            .save()
        );


      // 4) Redirect to the newly created resume
      this.router.transitionTo('resumes.show', source.id);
    } catch (e) {
      console.error('Failed to clone resume', e);
      alert?.('Failed to clone resume.');
    }
}
