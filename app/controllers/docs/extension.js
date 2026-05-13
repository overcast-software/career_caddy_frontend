import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class DocsExtensionController extends Controller {
  @service extensionInstall;

  get installLink() {
    return this.extensionInstall.installLink;
  }
}
