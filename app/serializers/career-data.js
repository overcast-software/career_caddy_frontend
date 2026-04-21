import ApplicationSerializer from './application';

export default class CareerDataSerializer extends ApplicationSerializer {
  normalizeQueryRecordResponse(store, primaryModelClass, payload) {
    // Backend returns
    //   { data: <markdown>,
    //     sections: [{type, title, items:[…]}, …],
    //     meta: {resume_ids, cover_letter_ids, answer_ids} }
    // Reshape into JSON:API with a fixed id.
    const meta = payload.meta || {};
    const normalized = {
      data: {
        id: '1',
        type: 'career-data',
        attributes: {
          data: payload.data,
          sections: payload.sections ?? [],
          'resume-ids': meta.resume_ids ?? [],
          'cover-letter-ids': meta.cover_letter_ids ?? [],
          'answer-ids': meta.answer_ids ?? [],
        },
      },
    };
    return normalized;
  }
}
