export default async function exportResumeToWord(store, session, resumeId) {
  const adapter = store.adapterFor('resume');
  const base = adapter.buildURL('resume', resumeId);
  const url = `${base}export`;

  const headers = {};
  if (session.authorizationHeader) {
    headers['Authorization'] = session.authorizationHeader;
  }

  const resp = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers,
  });
  if (!resp.ok) throw new Error(`Export failed (${resp.status})`);

  const ct = resp.headers.get('content-type') || '';
  if (
    ct.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ) ||
    ct.includes('application/octet-stream')
  ) {
    const blob = await resp.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resume-${resumeId}.docx`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  } else {
    try {
      const data = await resp.json();
      if (data?.url) window.location.assign(data.url);
    } catch {
      /* ignore */
    }
  }
}
