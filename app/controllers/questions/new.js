import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class QuestionsNewController extends Controller {
  @service flashMessages;

  queryParams = ['companyId', 'jobPostId', 'jobApplicationId'];
  companyId = null;
  jobPostId = null;
  jobApplicationId = null;
}
