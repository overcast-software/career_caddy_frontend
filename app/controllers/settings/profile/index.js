import Controller from '@ember/controller';
import { service } from '@ember/service';

// CCEXT-18: Profile is identity-only. The quick-copy list moved to its own
// settings sub-route (settings.quick-copy), so this controller no longer owns
// any copy affordances.
export default class SettingsProfileIndexController extends Controller {
  @service flashMessages;
}
