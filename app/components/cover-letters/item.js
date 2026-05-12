import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { downloadResource } from 'career-caddy-frontend/utils/download';

export default class CoverLettersItemComponent extends Component {
  @service store;
  @service session;
  @service flashMessages;
  @tracked isExporting = false;

  get jobPost() {
    return this.args.coverLetter.belongsTo('job-post').value();
  }

  get resume() {
    return this.args.coverLetter.get('resume.name');
  }

  get company() {
    return this.args.coverLetter.get('job-post.company');
  }

  @action
  async toggleFavorite() {
    const cl = this.args.coverLetter;
    cl.favorite = !cl.favorite;
    try {
      await cl.save();
      this.store.peekRecord('career-data', '1')?.markDirty();
      const status = cl.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Cover letter ${status} favorites`);
    } catch {
      cl.favorite = !cl.favorite;
      this.flashMessages.danger('Failed to update favorite status');
    }
  }

  @action
  async exportToDocx() {
    if (this.isExporting) {
      this.flashMessages.warning('Export already in progress.');
      return;
    }
    this.isExporting = true;
    try {
      const id = this.args.coverLetter.id;
      await downloadResource({
        adapter: this.store.adapterFor('cover-letter'),
        session: this.session,
        modelName: 'cover-letter',
        id,
        path: 'export',
        filename: `cover-letter-${id}.docx`,
      });
    } catch (e) {
      this.flashMessages.danger(e);
    } finally {
      this.isExporting = false;
    }
  }
}
