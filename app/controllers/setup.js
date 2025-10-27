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
        
        if (!this.model.username || this.model.username.trim() === '') {
            this.errorMessage = 'Username is required';
            this.saving = false;
            return;
        }
        
        if (!this.model.password || this.model.password.length < 8) {
            this.errorMessage = 'Password must be at least 8 characters long';
            this.saving = false;
            return;
        }
        
        if (!this.model.firstName || this.model.firstName.trim() === '') {
            this.errorMessage = 'First name is required';
            this.saving = false;
            return;
        }
        
        if (!this.model.lastName || this.model.lastName.trim() === '') {
            this.errorMessage = 'Last name is required';
            this.saving = false;
            return;
        }
        
        try {
            await this.session.register({
                username: this.model.username,
                email: this.model.email,
                first_name: this.model.firstName,
                last_name: this.model.lastName,
                phone: this.model.phone,
                password: this.model.password
            });
            this.model.password = null;
            this.health.setHealthy(true);
            this.router.transitionTo('login');
        } catch (error) {
            if (error.status === 409) {
                this.errorMessage = 'Account already exists; please log in';
            } else {
                this.errorMessage = error.message || 'Failed to create account';
            }
        } finally {
            this.saving = false;
        }
    }

    @action updateFirstName(event){
        this.model.firstName = event.target.value
    }
    @action updateLastName(event){
        this.model.lastName = event.target.value
    }
    @action updateEmail(event){
        this.model.email  = event.target.value
    }
    @action updatePhone(event){
        this.model.phone = event.target.value
    }
    @action updateUsername(event){
        this.model.username = event.target.value
    }
    @action updatePassword(event){
        this.model.password = event.target.value
    }
    @action cancel() {
        this.model.password = null;
        this.router.transitionTo('index');
    }
}
