export default async function cloneResume(store, router, flashMessages, resumeId) {
  try {
    const adapter = store.adapterFor('resume');
    const url = `${adapter.buildURL('resume', resumeId)}clone/`;
    const payload = await adapter.ajax(url, 'POST');
    const clone = store.push(
      store
        .serializerFor('resume')
        .normalizeResponse(
          store,
          store.modelFor('resume'),
          payload,
          null,
          'createRecord',
        ),
    );
    flashMessages.success('Resume successfully cloned');
    router.transitionTo('resumes.show', clone.id);
  } catch {
    flashMessages.warning('Failed to clone resume');
  }
}
