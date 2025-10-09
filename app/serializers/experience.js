import ApplicationSerializer from './application';

export default class ExperienceSerializer extends ApplicationSerializer {
    // createRecord(store, type, snapshot) {
    //     //we can detect dirty records here
    //     const data = this.serialize(snapshot, { includeId: true });

    //     const resumeId = snapshot.belongsTo('resume', { id: true });
    //     const url = `resumes/${resumeId}/certifications`;

    //     return this.ajax(url, 'POST', { data });
    // }
}
