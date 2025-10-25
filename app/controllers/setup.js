import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SetupController extends Controller {
    @service health;
    @service router;
    @service session;
    @tracked saving = false;
    @tracked errorMessage = null;

    @action async save(event) {
        event.preventDefault();
        this.saving = true;
        this.errorMessage = null;
        try {
            await this.model.save();
            this.health.setHealthy(true);
            this.router.transitionTo('login');
        } catch (error) {
            this.errorMessage = error.message || 'Failed to save user';
        } finally {
            this.saving = false;
        }
    }

    @action updateName(event){
        this.model.name = event.target.value
    }
    @action updateEmail(event){
        this.model.email  = event.target.value
    }
    @action updatePhone(event){
        this.model.phone = event.target.value
    }
    @action cancel() {
        this.model.rollbackAttributes();
        this.router.transitionTo('index');
    }
}
