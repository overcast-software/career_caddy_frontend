import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class ResumesCompact extends Component {
  @service spinner;
  @service flashMessages;
  @action toggleFavorite(resume) {
    resume.favorite = !resume.favorite;
    
    // Reload the resume to ensure all relationships are properly loaded
    resume.reload()
      .then(() => resume.save())
      .then(() => {
        const status = resume.favorite ? 'added to' : 'removed from';
        this.flashMessages.success(`Resume ${status} favorites`);
      })
      .catch((error) => {
        console.error('Error saving resume favorite status:', error);
        resume.rollbackAttributes();
        const errorMessage = error.message || error.toString() || 'Unknown error';
        this.flashMessages.danger(`Failed to update favorite status: ${errorMessage}`);
      });
  }
  @action async deleteResume() {
    await this.spinner.wrap(this.args.resume.destroyRecord()).then(() => {
      this.flashMessages.success('deleted resume');
    });
  }
}
