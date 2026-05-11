// Trigger a file download from a resource sub-path that returns
// either a binary body (e.g. docx export) or a JSON `{url}` redirect
// to a pre-signed S3 URL. The api can pick either response shape per
// request — the utility branches on Content-Type.
//
// Why raw fetch instead of adapter.ajax / apiAction:
//   - The success body is binary (Blob), not JSON:API. apiAction's
//     auto-normalize would choke and the store doesn't want it anyway.
//   - The JSON fallback shape `{url: "https://s3..."}` is not JSON:API
//     either — it carries no `data` envelope.
//   - The "click a synthetic <a download>" pattern needs the raw
//     response object, not a parsed payload.
//
// Args (all required):
//   adapter    — store.adapterFor(modelName); used for buildURL.
//   session    — session service; used for Authorization header.
//   modelName  — string, e.g. 'cover-letter'.
//   id         — record id.
//   path       — sub-path appended to buildURL output, no slashes
//                (e.g. 'export'). buildURL emits a trailing slash, so
//                the final URL is /api/v1/<resource>/<id>/<path>.
//   filename   — name suggested to the browser via <a download>.
//   navigate?  — function called with a URL on the JSON-redirect path.
//                Defaults to window.location.assign. Injected so tests
//                can observe the redirect — Firefox refuses to redefine
//                window.location.assign at runtime.
//
// Returns { kind: 'blob' | 'redirect' | 'unknown', url? }.
export async function downloadResource({
  adapter,
  session,
  modelName,
  id,
  path,
  filename,
  navigate = (u) => window.location.assign(u),
}) {
  const base = adapter.buildURL(modelName, id);
  const url = `${base}${path}`;
  const headers = {};
  if (session.authorizationHeader) {
    headers.Authorization = session.authorizationHeader;
  }
  const resp = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers,
  });
  if (!resp.ok) throw new Error(`Download failed (${resp.status})`);

  const ct = resp.headers.get('content-type') || '';
  const isBinary =
    ct.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ) || ct.includes('application/octet-stream');

  if (isBinary) {
    const blob = await resp.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
    return { kind: 'blob' };
  }

  // JSON fallback: { url: "https://s3..." } pre-signed redirect.
  try {
    const data = await resp.json();
    if (data?.url) {
      navigate(data.url);
      return { kind: 'redirect', url: data.url };
    }
  } catch {
    // non-JSON, non-binary — fall through to unknown.
  }
  return { kind: 'unknown' };
}
