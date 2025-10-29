import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ResumeModel extends Model {
    @attr('string') content;
    @attr('string') filePath;
    @attr('string') title;
    @attr('string') name;
    @attr('string') notes;
    @belongsTo('user', { async: true, inverse: 'resume' }) user;
    @hasMany('score', { async: true, inverse: 'resume' }) scores;
    @hasMany('cover-letter', { async: true, inverse: 'resume' }) coverLetters;
    @hasMany('application', { async: true, inverse: 'resume' }) applications;
    @hasMany('experience', { async: true, inverse: 'resume' }) experiences;
    @hasMany('education', { async: true, inverse: 'resume' }) educations;
    @hasMany('summary', { async: true, inverse: 'resume' }) summaries;
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
      // return this.store.find('skill').find( (rec) => rec.active )
      // return this.skills.then( (skills) => skills.find( (rec) => rec.active) )
    }

    get activeSummary(){
        return this.hasMany('summaries').value().find( (rec) => rec.active )
    }

}
