import ApplicationSerializer from './application';

export default class ResumeSerializer extends ApplicationSerializer {
  serializeHasMany(snapshot, json, relationship) {
    if (relationship.key === 'summaries') {
      const records = snapshot.hasMany('summaries');
      if (records !== undefined) {
        json.data ??= {};
        json.data.relationships ??= {};
        json.data.relationships['summaries'] = {
          data: records.map((r) => ({ type: 'summaries', id: r.id })),
        };
      }
    }
  }
}
