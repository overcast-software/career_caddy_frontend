export default async function exportResumeToWord(store, session, resumeId) {
  const adapter = store.adapterFor('resume');
  const base = adapter.buildURL('resume', resumeId);
  const exportUrl = `${base}export`;

  const headers = {};
  if (session.authorizationHeader) {
    headers['Authorization'] = session.authorizationHeader;
  }

  const trigger = (blob, filename) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  };

  const fetchMarkdown = async () => {
    // Dedicated /markdown/ route — NOT ?format=md on /export/, which DRF
    // intercepts as a renderer-selection query param and 404s.
    const mdUrl = `${base}markdown`;
    const mdResp = await fetch(mdUrl, {
      method: 'GET',
      credentials: 'include',
      headers,
    });
    if (!mdResp.ok)
      throw new Error(`Markdown fallback failed (${mdResp.status})`);
    const blob = await mdResp.blob();
    trigger(blob, `resume-${resumeId}.md`);
    return 'md';
  };

  let resp;
  try {
    resp = await fetch(exportUrl, {
      method: 'GET',
      credentials: 'include',
      headers,
    });
  } catch {
    return fetchMarkdown();
  }

  if (!resp.ok) return fetchMarkdown();

  const ct = resp.headers.get('content-type') || '';
  if (
    ct.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ) ||
    ct.includes('application/octet-stream')
  ) {
    const blob = await resp.blob();
    trigger(blob, `resume-${resumeId}.docx`);
    return 'docx';
  }

  return fetchMarkdown();
}
