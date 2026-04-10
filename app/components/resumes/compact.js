import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class ResumesCompact extends Component {
  @service spinner;
  @service flashMessages;
  @service store;
  @action async toggleFavorite(resume) {
    resume.favorite = !resume.favorite;
    try {
      await resume.save();
      this.store.peekRecord('career-data', '1')?.markDirty();
      const status = resume.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Resume ${status} favorites`);
    } catch {
      resume.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status');
    }
  }
  @action async deleteResume() {
    await this.spinner.wrap(this.args.resume.destroyRecord()).then(() => {
      this.flashMessages.success('deleted resume');
    });
  }
}
