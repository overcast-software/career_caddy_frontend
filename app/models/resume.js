import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ResumeModel extends Model {
    @attr('string') content;
    @attr('string') filePath;
    @attr('string') title;
    @belongsTo('user', { async: true, inverse: null }) user;
    @hasMany('score', { async: true, inverse: null }) scores;
    @hasMany('cover-letter', { async: false, inverse: 'resume' }) coverLetters;
    @hasMany('application', { async: false, inverse: 'resume' }) applications;
    @hasMany('experience', { async: true, inverse: 'resume' }) experiences;
    @hasMany('education', { async: true, inverse: 'resume' }) educations;
    @hasMany('summary', { async: false, inverse: 'resume' }) summaries;
    @hasMany('certification', { async: true, inverse: 'resume' }) certifications;
    @hasMany('skill', { async: true, inverse: 'resume' }) skills;

    get education(){
        const edu = this.store.peekAll('education').find((rec) => rec.belongsTo('resume').id() === this.id);
        return edu
    }
    get certification(){
        const cert = this.store.peekAll('certification').find((rec) => rec.belongsTo('resume').id() === this.id);
        return cert
    }
    get activeSkill(){
        return this.hasMany('skills').value().find( (rec) => rec.active )
    }

    get activeSummary(){
        return this.hasMany('summaries').value().find( (rec) => rec.active )
    }

}
