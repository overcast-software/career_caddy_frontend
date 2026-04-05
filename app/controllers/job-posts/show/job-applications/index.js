import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };

export default class JobPostsShowJobApplicationsIndexController extends Controller {
  @service store;
  @service router;
  @service flashMessages;

  @tracked selectedResume = CAREER_DATA_OPTION;

  get resumes() {
    const all = this.store.peekAll('resume');
    if (!all?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(all)];
  }

  get jobPost() {
    return this.model.jobPost;
  }

  @action selectResume(resume) {
    this.selectedResume = resume;
  }
}
