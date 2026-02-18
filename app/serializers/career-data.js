import ApplicationSerializer from './application';

export default class CareerDataSerializer extends ApplicationSerializer {
  normalizeQueryRecordResponse(store, primaryModelClass, payload, id, requestType) {
    // The API returns {data: <markdown>} without an id
    // Transform to JSON:API format with a fixed id
    const normalized = {
      data: {
        id: '1',
        type: 'career-data',
        attributes: {
          data: payload.data,
        },
      },
    };
    return normalized;
  }
}
