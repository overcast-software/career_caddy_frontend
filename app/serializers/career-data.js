import ApplicationSerializer from './application';

export default class CareerDataSerializer extends ApplicationSerializer {
  normalizeQueryRecordResponse(store, primaryModelClass, payload) {
    // The API returns {data: <markdown>, meta: {resume_ids, cover_letter_ids, answer_ids}}
    // Transform to JSON:API format with a fixed id
    const meta = payload.meta || {};
    const normalized = {
      data: {
        id: '1',
        type: 'career-data',
        attributes: {
          data: payload.data,
          'resume-ids': meta.resume_ids ?? [],
          'cover-letter-ids': meta.cover_letter_ids ?? [],
          'answer-ids': meta.answer_ids ?? [],
        },
      },
    };
    return normalized;
  }
}
