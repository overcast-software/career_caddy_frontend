import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class ResumesCompact extends Component {
  @service spinner;
  @action async toggleFavorite(resume) {
    resume.favorite = !resume.favorite;
    try {
      await resume.save();
      const status = resume.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Resume ${status} favorites`);
    } catch (error) {
      resume.rollbackAttributes();
      this.flashMessages.danger('Failed to update favorite status');
    }
  }
  @action deleteResume() {
    this.spinner.wrap(this.args.resume.destroyRecord());
    this.spinner.clear();
  }
}
