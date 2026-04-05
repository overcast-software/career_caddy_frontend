// XXX I'm not sure we need this.
import ApplicationSerializer from './application';

export default class ScoreSerializer extends ApplicationSerializer {
  serializeBelongsTo(snapshot, json, relationship) {
    if (relationship.key === 'resume' && snapshot.belongsTo('resume') === null) {
      return;
    }
    super.serializeBelongsTo(snapshot, json, relationship);
  }
}
