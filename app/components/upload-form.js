import Component from '@glimmer/component';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';

export default class UploadForm extends Component {
  get accept() {
    return (
      this.args.accept ?? 'application/pdf,.pdf,.doc,.docx,.txt,text/plain'
    );
  }

  get inputId() {
    return `file-input-${guidFor(this)}`;
  }

  get handler() {
    return this.args.onFileAdded || this.args.onUpload;
  }

  @action onInputChange(queue, event) {
    let file = event.target?.files[0];
    //clear out all the files
    for (let f of queue.files) {
      queue.remove(f);
    }
    queue.add(file);
    // Allow selecting the same file repeatedly
    event.target.value = '';
  }

  @action onFileAdded(file) {
    if (typeof this.handler === 'function') {
      this.handler(file);
    }
  }

  @action handleFiles(files) {
    if (files && files.length) {
      for (let file of files) {
        this.args.onUpload(file);
      }
    }
  }
}
