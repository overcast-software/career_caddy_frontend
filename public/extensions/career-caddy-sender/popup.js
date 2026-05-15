const ORIGIN = 'https://api.careercaddy.online';
const FRONTEND_ORIGIN = 'https://careercaddy.online';
const STORAGE_KEYS = ['ccApiKey', 'ccKeyId', 'ccUsername', 'ccAutoScore', 'ccPending'];
const PENDING_MAX_AGE_MS = 30_000;
const THEME_KEYS = ['ccTheme', 'ccPalette'];
const VALID_MODES = new Set(['system', 'light', 'dark']);
const VALID_PALETTES = new Set([
  'indigo',
  'jade',
  'rose',
  'amber',
  'violet',
  'blue',
]);
const api = typeof browser !== 'undefined' ? browser : chrome;

// Mirrors api/job_hunting/lib/url_policy.py — defense in depth, fast-fail
// the obvious cases before a round-trip. The API is authoritative.
const SELF_HOSTS = new Set(['careercaddy.online', 'www.careercaddy.online']);
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);
const PRIVATE_SUFFIXES = ['.local', '.internal', '.lan', '.localhost'];

function classifyUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, message: "This page's URL couldn't be parsed." };
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return {
      ok: false,
      message: `This page uses ${parsed.protocol} — only http and https can be sent.`,
    };
  }
  const host = parsed.hostname.toLowerCase();
  if (SELF_HOSTS.has(host)) {
    return {
      ok: false,
      message: 'This page is on Career Caddy itself — nothing to ingest.',
    };
  }
  if (host === 'localhost' || PRIVATE_SUFFIXES.some((s) => host.endsWith(s))) {
    return {
      ok: false,
      message: `${host} is private/internal and can't be ingested.`,
    };
  }
  return { ok: true };
}

const $ = (id) => document.getElementById(id);

const screenConnect = $('screen-connect');
const screenConnected = $('screen-connected');
const screenTracked = $('screen-tracked');
const screenLoading = $('screen-loading');
const versionEl = $('version');

const openSigninBtn = $('open-signin');
const connectStatus = $('connect-status');

const sendBtn = $('send');
const sendStatus = $('send-status');
const resultLinkEl = $('result-link');
const dismissBtn = $('dismiss');
const autoScoreBox = $('auto-score');
const autoScoreRow = $('auto-score-row');
const postSendScoreBtn = $('post-send-score-btn');
const postSendScoreStatus = $('post-send-score-status');
const whoEl = $('who');
const disconnectBtn = $('disconnect');
const themeToggleBtn = $('theme-toggle');

const trackedTitleEl = $('tracked-title');
const trackedCompanyEl = $('tracked-company');
const trackedScoreEl = $('tracked-score');
const trackedOpenEl = $('tracked-open');
const trackedScoreBtn = $('tracked-score-btn');
const trackedScoreStatus = $('tracked-score-status');
let trackedJobPostId = null;
const whoTrackedEl = $('who-tracked');
const disconnectTrackedBtn = $('disconnect-tracked');
const themeToggleTrackedBtn = $('theme-toggle-tracked');

const SUN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const MOON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function isDarkMode(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return prefersDark.matches;
}

function applyTheme(mode, palette) {
  const root = document.documentElement;
  const dark = isDarkMode(mode);
  root.dataset.theme = dark ? 'dark' : '';
  root.dataset.palette = palette === 'indigo' ? '' : palette || '';
  const icon = dark ? SUN_SVG : MOON_SVG;
  if (themeToggleBtn) themeToggleBtn.innerHTML = icon;
  if (themeToggleTrackedBtn) themeToggleTrackedBtn.innerHTML = icon;
}

function loadTheme() {
  return api.storage.local.get(THEME_KEYS).then((saved) => {
    const mode = VALID_MODES.has(saved.ccTheme) ? saved.ccTheme : 'system';
    const palette = VALID_PALETTES.has(saved.ccPalette)
      ? saved.ccPalette
      : 'indigo';
    applyTheme(mode, palette);
    return { mode, palette };
  });
}

prefersDark.addEventListener('change', () => loadTheme());

async function toggleTheme() {
  const { ccTheme = 'system', ccPalette = 'indigo' } =
    await api.storage.local.get(THEME_KEYS);
  const currentlyDark = isDarkMode(ccTheme);
  const next = currentlyDark ? 'light' : 'dark';
  await api.storage.local.set({ ccTheme: next });
  applyTheme(next, ccPalette);
}

if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
if (themeToggleTrackedBtn)
  themeToggleTrackedBtn.addEventListener('click', toggleTheme);

// Best-effort palette sync from any open CC tab. We deliberately do NOT
// import light/dark mode — the popup's toggle is the source of truth for
// mode so a site-side dark switch can't override the user's popup choice.
async function importPaletteFromActiveTab() {
  try {
    const [active] = await api.tabs.query({ active: true, currentWindow: true });
    let target = null;
    if (active && active.url) {
      const host = new URL(active.url).hostname.toLowerCase();
      if (SELF_HOSTS.has(host)) target = active;
    }
    if (!target) {
      const allTabs = await api.tabs.query({});
      target = allTabs.find((t) => {
        if (!t.url) return false;
        try {
          return SELF_HOSTS.has(new URL(t.url).hostname.toLowerCase());
        } catch {
          return false;
        }
      });
    }
    if (!target) return;
    const results = await api.scripting.executeScript({
      target: { tabId: target.id },
      func: () => ({ palette: localStorage.getItem('theme-palette') }),
    });
    const themeData = results && results[0] && results[0].result;
    if (!themeData) return;
    if (VALID_PALETTES.has(themeData.palette)) {
      await api.storage.local.set({ ccPalette: themeData.palette });
      await loadTheme();
    }
  } catch {
    // best-effort; silently skip
  }
}

try {
  versionEl.textContent = `v${api.runtime.getManifest().version}`;
} catch {
  versionEl.textContent = '';
}

function setStatus(el, msg, kind = 'info') {
  el.textContent = msg;
  el.classList.remove('error', 'success');
  if (kind === 'error') el.classList.add('error');
  if (kind === 'success') el.classList.add('success');
}

function jobPostUrl(jobPostId, { withScores = false } = {}) {
  if (!jobPostId) return null;
  return withScores
    ? `${FRONTEND_ORIGIN}/job-posts/${jobPostId}/scores`
    : `${FRONTEND_ORIGIN}/job-posts/${jobPostId}`;
}

function hideResultLink() {
  resultLinkEl.classList.add('hidden');
  resultLinkEl.removeAttribute('href');
  resultLinkEl.textContent = '';
  if (dismissBtn) dismissBtn.classList.add('hidden');
}

function showResultLink(jobPostId, { withScores = false, label } = {}) {
  const url = jobPostUrl(jobPostId, { withScores });
  if (!url) return;
  resultLinkEl.href = url;
  resultLinkEl.textContent =
    label || (withScores ? 'View score' : 'View job post');
  resultLinkEl.classList.remove('hidden');
  if (dismissBtn) dismissBtn.classList.remove('hidden');
}

function setSendingState(sending) {
  if (sending) {
    sendBtn.dataset.state = 'sending';
    sendBtn.disabled = true;
  } else {
    delete sendBtn.dataset.state;
    sendBtn.disabled = false;
  }
}

function hideAllScreens() {
  screenLoading.classList.add('hidden');
  screenConnect.classList.add('hidden');
  screenConnected.classList.add('hidden');
  screenTracked.classList.add('hidden');
}

function showLoading() {
  hideAllScreens();
  screenLoading.classList.remove('hidden');
}

function showConnect(message = '') {
  hideAllScreens();
  screenConnect.classList.remove('hidden');
  hideResultLink();
  setSendingState(false);
  setStatus(connectStatus, message);
}

function showConnected(name, incompleteTarget = null) {
  hideAllScreens();
  screenConnected.classList.remove('hidden');
  whoEl.textContent = name || '';
  hideResultLink();
  setSendingState(false);
  setStatus(sendStatus, '');

  // Resend mode: an existing JobPost was found at this URL but is
  // flagged incomplete (cc_auto email-stub, user-flagged, or the
  // CompletenessReviewer rejected an earlier scrape). Swap heading
  // and button label so the user sees they're refreshing an existing
  // post — not creating a new one.
  const headingEl = document.getElementById('connected-heading');
  const bannerEl = document.getElementById('incomplete-banner');
  const bannerTitleEl = document.getElementById('incomplete-banner-title');
  const bannerCompanyEl = document.getElementById('incomplete-banner-company');
  const sendLabelEl = sendBtn.querySelector('.btn-label');
  if (incompleteTarget) {
    if (headingEl) headingEl.textContent = 'Complete this post';
    if (bannerEl) bannerEl.classList.remove('hidden');
    if (bannerTitleEl) {
      bannerTitleEl.textContent =
        incompleteTarget.title || '(untitled job post)';
    }
    if (bannerCompanyEl) {
      bannerCompanyEl.textContent = incompleteTarget.company || '';
    }
    if (sendLabelEl) sendLabelEl.textContent = 'Resend to complete';
  } else {
    if (headingEl) headingEl.textContent = 'Send this page to Career Caddy';
    if (bannerEl) bannerEl.classList.add('hidden');
    if (sendLabelEl) sendLabelEl.textContent = 'Send this page';
  }
}

function showTracked({ id, title, company, topScore, hasPendingScore }, name) {
  hideAllScreens();
  screenTracked.classList.remove('hidden');
  trackedJobPostId = id;
  trackedTitleEl.textContent = title || '(untitled job post)';
  trackedCompanyEl.textContent = company || '';
  const hasScore = topScore !== null && topScore !== undefined;
  if (hasScore) {
    trackedScoreEl.textContent = String(topScore);
    trackedScoreEl.classList.remove('hidden');
  } else {
    trackedScoreEl.textContent = '';
    trackedScoreEl.classList.add('hidden');
  }
  trackedOpenEl.href = `${FRONTEND_ORIGIN}/job-posts/${id}`;
  // Score button: only offered when there's no top_score AND no scoring
  // is in flight. A pending score blocks re-scoring; a completed top_score
  // is already surfaced via the badge so the button has nothing to add.
  if (hasPendingScore) {
    trackedScoreBtn.classList.add('hidden');
    setStatus(trackedScoreStatus, 'Scoring in progress…');
  } else if (!hasScore) {
    trackedScoreBtn.classList.remove('hidden');
    trackedScoreBtn.disabled = false;
    delete trackedScoreBtn.dataset.state;
    trackedScoreBtn.querySelector('.btn-label').textContent = 'Score this post';
    setStatus(trackedScoreStatus, '');
  } else {
    trackedScoreBtn.classList.add('hidden');
    setStatus(trackedScoreStatus, '');
  }
  whoTrackedEl.textContent = name || '';
}

async function lookupExistingJobPost(tabUrl, apiKey) {
  if (!tabUrl) return null;
  const verdict = classifyUrl(tabUrl);
  if (!verdict.ok) return null;
  let resp;
  try {
    const url =
      `${ORIGIN}/api/v1/job-posts/?filter%5Blink%5D=${encodeURIComponent(tabUrl)}` +
      `&include=company,scores`;
    resp = await fetch(url, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch {
    return null;
  }
  if (!resp.ok) return null;
  let body;
  try {
    body = await resp.json();
  } catch {
    return null;
  }
  const item = body?.data?.[0];
  if (!item) return null;
  const attrs = item.attributes || {};
  let company = null;
  const companyRel = item.relationships?.company?.data;
  if (companyRel && Array.isArray(body.included)) {
    const inc = body.included.find(
      (r) =>
        r &&
        (r.type === 'company' || r.type === 'companies') &&
        String(r.id) === String(companyRel.id),
    );
    company = inc?.attributes?.name || null;
  }
  const topScore =
    typeof attrs.top_score === 'number' ? attrs.top_score : null;
  // If any score on this JobPost is still pending, don't offer to score
  // again — even across users (mirrors the cross-user top_score behavior).
  const hasPendingScore = Array.isArray(body.included)
    ? body.included.some(
        (r) =>
          r &&
          (r.type === 'score' || r.type === 'scores') &&
          r.attributes?.status === 'pending',
      )
    : false;
  // `complete` defaults to true so an older API that doesn't ship the
  // field doesn't surprise users with the "completing existing post"
  // caption. The newer api is authoritative — when false, the popup
  // surfaces Send instead of Open so the user can refresh the JP.
  const complete = attrs.complete === false ? false : true;
  return {
    id: item.id,
    title: attrs.title,
    company,
    topScore,
    hasPendingScore,
    complete,
  };
}

// Show the skeleton while we figure out which final screen the user
// should land on. Resolves to Tracked (if the active URL is already in
// the library) or Connected (Send UI). On lookup failure / network
// error the catch routes to Connected — no time-based fallback, since
// flipping to Send before the lookup returns flashes the wrong UI.
async function resolveOpenScreen(apiKey, name) {
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showConnected(name);
      return;
    }
    const { ccPending } = await api.storage.local.get(['ccPending']);
    if (
      ccPending &&
      ccPending.url === tab.url &&
      Date.now() - ccPending.startedAt < PENDING_MAX_AGE_MS
    ) {
      showSending(name);
      return;
    }
    const found = await lookupExistingJobPost(tab.url, apiKey);
    if (found && found.complete) {
      // Already in the library and flagged complete — Open the JP, no
      // re-scrape needed. (User can flip "Mark incomplete" on the JP
      // detail page if the scrape was wrong.)
      showTracked(found, name);
    } else if (found && !found.complete) {
      // Exists but flagged !complete — cc_auto stub, user-flagged, or
      // the CompletenessReviewer rejected an earlier scrape. Send is
      // enabled; the from-text endpoint's dedup bypass lets the new
      // text through and parse_scrape upgrades the JP in place. Pass
      // the found post into showConnected so the screen renders the
      // resend variant (banner + Resend label).
      showConnected(name, found);
    } else {
      showConnected(name);
    }
  } catch {
    showConnected(name);
  }
}

function showSending(name) {
  showConnected(name);
  if (autoScoreRow) autoScoreRow.classList.add('hidden');
  setSendingState(true);
  setStatus(sendStatus, 'Send in progress — close and reopen for status.');
  if (dismissBtn) dismissBtn.classList.remove('hidden');
}

function loadSaved() {
  return api.storage.local.get(STORAGE_KEYS).then(async (saved) => {
    autoScoreBox.checked =
      saved.ccAutoScore === undefined ? true : !!saved.ccAutoScore;
    if (saved.ccApiKey && saved.ccKeyId) {
      // Show the skeleton while the popup-open lookup resolves; resolveOpenScreen
      // swaps to either Tracked (URL already in library) or Connected (Send UI).
      // Single network request, popup-open only — never on tab change.
      showLoading();
      resolveOpenScreen(saved.ccApiKey, saved.ccUsername);
    } else {
      // No stored key — try SPA-session SSO before falling back to the
      // Connect screen. Reads the active careercaddy.online tab's
      // ember-simple-auth session and mints an API key from the JWT.
      showLoading();
      const ssoResult = await attemptSsoFromActiveTab();
      if (ssoResult.ok) {
        await api.storage.local.set({
          ccApiKey: ssoResult.apiKey,
          ccKeyId: ssoResult.keyId,
          ccUsername: ssoResult.username,
        });
        resolveOpenScreen(ssoResult.apiKey, ssoResult.username);
      } else {
        showConnect(ssoResult.message || '');
      }
    }
    importPaletteFromActiveTab();
  });
}

// Walk every open tab for a careercaddy.online session in localStorage.
// ESA stores the JWT under `ember_simple_auth-session` with shape:
//   {"authenticated":{"authenticator":"authenticator:jwt","access":"...","refresh":"..."}}
// We mint an API key from the access token (refreshing first if it's
// expired), then store the key. No popup login form needed.
async function attemptSsoFromActiveTab() {
  let session;
  try {
    session = await readSpaSession();
  } catch (err) {
    console.warn('[cc-sender] SSO read failed', err);
    return { ok: false, message: '' };
  }
  if (!session) {
    return {
      ok: false,
      message: '',
    };
  }

  // Refresh proactively — the access token cached in localStorage may
  // have expired since the SPA tab last refreshed. The refresh endpoint
  // is idempotent and cheap.
  let access = session.access;
  if (session.refresh) {
    try {
      const fresh = await fetch(`${ORIGIN}/api/v1/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: session.refresh }),
      });
      if (fresh.ok) {
        const body = await fresh.json();
        if (body?.access) access = body.access;
      }
    } catch {
      // Use the stored access; api-key POST below will surface auth issues.
    }
  }
  if (!access) return { ok: false, message: '' };

  const minted = await mintApiKey(access);
  if (!minted.ok) return { ok: false, message: minted.message };

  return {
    ok: true,
    apiKey: minted.apiKey,
    keyId: minted.keyId,
    username: session.username || '',
  };
}

async function readSpaSession() {
  const allTabs = await api.tabs.query({});
  const spaTab = allTabs.find((t) => {
    if (!t.url) return false;
    try {
      return SELF_HOSTS.has(new URL(t.url).hostname.toLowerCase());
    } catch {
      return false;
    }
  });
  if (!spaTab) return null;
  const results = await api.scripting.executeScript({
    target: { tabId: spaTab.id },
    func: () => {
      const raw = window.localStorage.getItem('ember_simple_auth-session');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        const authed = parsed?.authenticated || {};
        return {
          access: authed.access || null,
          refresh: authed.refresh || null,
          username: parsed?.username || null,
        };
      } catch {
        return null;
      }
    },
  });
  return (results && results[0] && results[0].result) || null;
}

async function mintApiKey(access) {
  const today = new Date().toISOString().slice(0, 10);
  let resp;
  try {
    resp = await fetch(`${ORIGIN}/api/v1/api-keys/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        data: {
          type: 'api-keys',
          attributes: {
            name: `Career Caddy Sender — ${today}`,
            scopes: ['read', 'write'],
          },
        },
      }),
    });
  } catch (err) {
    return { ok: false, message: `Could not reach Career Caddy: ${err.message}` };
  }
  if (resp.status === 401 || resp.status === 403) {
    return {
      ok: false,
      message: 'Your session expired — sign in to Career Caddy again.',
    };
  }
  if (!resp.ok) {
    const txt = await resp.text();
    console.error('[cc-sender] api-key create failed', resp.status, txt);
    return { ok: false, message: `Could not create API key (${resp.status}).` };
  }
  let body;
  try {
    body = await resp.json();
  } catch {
    return { ok: false, message: 'API key response was malformed.' };
  }
  const attrs = body?.data?.attributes || {};
  const keyId = body?.data?.id;
  const apiKey = attrs.key;
  if (!apiKey || !keyId) {
    return { ok: false, message: 'API key response was malformed.' };
  }
  return { ok: true, apiKey, keyId };
}

function persistAutoScore() {
  api.storage.local
    .set({ ccAutoScore: autoScoreBox.checked })
    .catch(() => {});
}

autoScoreBox.addEventListener('change', persistAutoScore);

// "Sign in to Career Caddy" — opens the SPA's login route in a new tab.
// After the user signs in there, reopening the popup picks up the
// session via `attemptSsoFromActiveTab` and connects automatically.
openSigninBtn.addEventListener('click', () => {
  api.tabs.create({ url: `${FRONTEND_ORIGIN}/login` });
  window.close();
});

async function handleDisconnect() {
  disconnectBtn.disabled = true;
  disconnectTrackedBtn.disabled = true;
  setStatus(sendStatus, 'Disconnecting…');
  const saved = await api.storage.local.get(['ccApiKey', 'ccKeyId']);
  if (saved.ccApiKey && saved.ccKeyId) {
    try {
      await fetch(`${ORIGIN}/api/v1/api-keys/${saved.ccKeyId}/revoke/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${saved.ccApiKey}` },
      });
    } catch (err) {
      console.warn('[cc-sender] revoke best-effort failed', err);
    }
  }
  await api.storage.local.remove([
    'ccApiKey',
    'ccKeyId',
    'ccUsername',
  ]);
  disconnectBtn.disabled = false;
  disconnectTrackedBtn.disabled = false;
  showConnect();
}

disconnectBtn.addEventListener('click', handleDisconnect);
disconnectTrackedBtn.addEventListener('click', handleDisconnect);

async function grabPayload(tabId) {
  // allFrames so iframe-embedded ATS bodies (greenhouse boards, worksourcewa
  // GetJob.aspx, lever overlays) get captured. results[0] is the top frame
  // — its URL is the canonical link. Subframes append their text after a
  // separator so the parse agent has a structural hint.
  const results = await api.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => ({
      url: location.href,
      text: document.body ? document.body.innerText : '',
    }),
  });
  if (!results || !results.length) return null;
  const top = results[0];
  if (!top || !top.result) return null;
  const allText = results
    .map((r) => r && r.result && r.result.text)
    .filter(Boolean)
    .join('\n\n--- frame ---\n\n');
  return { url: top.result.url, text: allText };
}

// Top-frame-only extractors for cross-platform dedup hints. Each is
// best-effort — selector misses or DOM shape changes return null without
// throwing, so a LinkedIn layout shift never blocks a send. Returns:
//   { apply_url_hint, canonical_link_hint, referrer_url }
//
// Per popup → page context boundary, the `func` body must be
// self-contained: closure refs to module-scoped constants are NOT
// available inside the injected script. The referrer allowlist is
// duplicated inline below.
async function grabHints(tabId) {
  const results = await api.scripting.executeScript({
    target: { tabId },
    func: () => {
      const REFERRER_HOSTS = new Set([
        'linkedin.com',
        'indeed.com',
        'glassdoor.com',
        'ziprecruiter.com',
      ]);

      function decodeLinkedInSafetyGo(href) {
        if (!href) return null;
        try {
          const parsed = new URL(href, location.href);
          if (
            parsed.hostname.endsWith('linkedin.com') &&
            parsed.pathname.startsWith('/safety/go')
          ) {
            const dest = parsed.searchParams.get('url');
            return dest || null;
          }
          // Non-safety/go href — return the raw absolute URL.
          return parsed.toString();
        } catch {
          return null;
        }
      }

      function extractApplyUrl() {
        if (!location.hostname.endsWith('linkedin.com')) return null;
        const selectors = [
          'a.jobs-apply-button[href]',
          'a[data-test-job-apply-button][href]',
          'a[data-control-name="jobdetails_topcard_inapply"][href]',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.getAttribute('href')) {
            const decoded = decodeLinkedInSafetyGo(el.getAttribute('href'));
            if (decoded) return decoded;
          }
        }
        return null;
      }

      function extractCanonicalLink() {
        if (!location.hostname.endsWith('linkedin.com')) return null;
        const meta = document.querySelector('meta[property="og:url"]');
        const content = meta && meta.getAttribute('content');
        if (!content) return null;
        try {
          return new URL(content, location.href).toString();
        } catch {
          return null;
        }
      }

      function extractReferrer() {
        const raw = document.referrer;
        if (!raw) return null;
        try {
          const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
          const allowed = [...REFERRER_HOSTS].some(
            (h) => host === h || host.endsWith('.' + h),
          );
          return allowed ? raw : null;
        } catch {
          return null;
        }
      }

      return {
        apply_url_hint: extractApplyUrl(),
        canonical_link_hint: extractCanonicalLink(),
        referrer_url: extractReferrer(),
      };
    },
  });
  if (!results || !results.length || !results[0] || !results[0].result) {
    return { apply_url_hint: null, canonical_link_hint: null, referrer_url: null };
  }
  return results[0].result;
}

function clearPending() {
  return api.storage.local.remove('ccPending').catch(() => {});
}

sendBtn.addEventListener('click', async () => {
  hideResultLink();
  setSendingState(true);
  if (autoScoreRow) autoScoreRow.classList.add('hidden');
  setStatus(sendStatus, 'Reading page…');

  const saved = await api.storage.local.get(['ccApiKey', 'ccKeyId']);
  if (!saved.ccApiKey) {
    setStatus(sendStatus, 'Not connected.', 'error');
    setSendingState(false);
    showConnect();
    return;
  }

  let payload;
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active tab');
    if (tab.url) {
      const verdict = classifyUrl(tab.url);
      if (!verdict.ok) {
        setStatus(sendStatus, verdict.message, 'error');
        setSendingState(false);
        return;
      }
      // Mark in-flight so a popup re-open during the fetch shows
      // "Sending…" instead of a fresh Send button.
      await api.storage.local.set({
        ccPending: { url: tab.url, startedAt: Date.now() },
      });
    }
    payload = await grabPayload(tab.id);
    if (!payload || !payload.text) {
      throw new Error('Page read blocked (restricted URL?)');
    }
  } catch (err) {
    setStatus(sendStatus, err.message, 'error');
    setSendingState(false);
    await clearPending();
    return;
  }

  // Hints are best-effort — a thrown extractor must never block the send.
  let hints = { apply_url_hint: null, canonical_link_hint: null, referrer_url: null };
  try {
    const [tab2] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab2 && tab2.id) {
      hints = await grabHints(tab2.id);
    }
  } catch (err) {
    console.warn('[cc-sender] hint extraction failed', err);
  }

  setStatus(sendStatus, 'Sending…');

  const wantsScore = autoScoreBox.checked;

  let resp;
  try {
    resp = await fetch(`${ORIGIN}/api/v1/scrapes/from-text/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${saved.ccApiKey}`,
      },
      body: JSON.stringify({
        text: payload.text,
        link: payload.url,
        source: 'extension',
        auto_score: wantsScore,
        apply_url_hint: hints.apply_url_hint,
        canonical_link_hint: hints.canonical_link_hint,
        referrer_url: hints.referrer_url,
      }),
    });
  } catch (err) {
    setStatus(sendStatus, `Network error: ${err.message}`, 'error');
    setSendingState(false);
    await clearPending();
    return;
  }

  if (resp.status === 401 || resp.status === 403) {
    setStatus(sendStatus, 'Session expired — reconnecting required.', 'error');
    await api.storage.local.remove(['ccApiKey', 'ccKeyId', 'ccUsername']);
    setSendingState(false);
    await clearPending();
    showConnect();
    return;
  }

  let body;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }

  if (resp.status === 409) {
    const meta = body?.errors?.[0]?.meta || {};
    const title = meta.title || meta.company_name || payload.url;
    const existingJobPostId = meta.job_post_id;
    if (existingJobPostId) {
      // 409 = duplicate; existing post may have a prior score. Don't
      // assume the user wants /scores — link to the post page itself.
      showResultLink(existingJobPostId, { withScores: false });
    }
    api.runtime
      .sendMessage({
        type: 'cc-notify-existing',
        title,
        jobPostId: existingJobPostId,
        frontendOrigin: FRONTEND_ORIGIN,
      })
      .catch(() => {});
    setStatus(sendStatus, 'Already in your library.', 'success');
    setSendingState(false);
    await clearPending();
    return;
  }

  if (!resp.ok) {
    const detail = body?.errors?.[0]?.detail || `HTTP ${resp.status}`;
    setStatus(sendStatus, `Error: ${detail}`, 'error');
    setSendingState(false);
    await clearPending();
    return;
  }

  const scrapeId = body?.data?.id;
  if (!scrapeId) {
    setStatus(sendStatus, 'Sent, but no scrape id returned.', 'error');
    setSendingState(false);
    await clearPending();
    return;
  }

  // The from-text endpoint runs parse_scrape synchronously, so the scrape
  // already has a job_post_id by the time the response returns. Surface
  // the link immediately and fire the "added" OS notification now —
  // don't wait for the bg poll. The bg path still polls for the score
  // result when auto-score is on; that's the SECOND, score-aware
  // notification.
  const newJobPostId =
    body?.data?.relationships?.['job-post']?.data?.id || null;
  const includedJobPost = (body?.included || []).find(
    (r) =>
      r &&
      (r.type === 'job-post' || r.type === 'job-posts') &&
      String(r.id) === String(newJobPostId),
  );
  const newJobTitle =
    includedJobPost?.attributes?.title || payload.url;
  // canonical_redirect (from response meta) tells us where the user
  // should actually land — when LinkedIn is submitted with apply_url_hint
  // pointing at an ATS JP, the ATS JP is the canonical record and the
  // link should route there instead of the LinkedIn JP we just created.
  const canonicalRedirect = body?.meta?.canonical_redirect || null;
  const landingJobPostId = canonicalRedirect || newJobPostId;
  if (landingJobPostId) {
    showResultLink(landingJobPostId, { withScores: wantsScore });
  }

  // Fire the immediate "Added ✓" / "Added ✓ — scoring…" notification
  // from the popup so the user gets feedback even before the popup
  // closes. The background polls for the SCORE completion afterwards
  // (and skips its own redundant "Added" notification — see
  // cc-notify-created handling in background.js).
  api.runtime
    .sendMessage({
      type: 'cc-notify-created',
      title: newJobTitle,
      jobPostId: newJobPostId,
      withScores: wantsScore,
      frontendOrigin: FRONTEND_ORIGIN,
    })
    .catch(() => {});

  api.runtime
    .sendMessage({
      type: 'cc-scrape-queued',
      scrapeId,
      origin: ORIGIN,
      apiKey: saved.ccApiKey,
      url: payload.url,
      autoScore: wantsScore,
      frontendOrigin: FRONTEND_ORIGIN,
      // Popup already fired the "added" notification; bg should only
      // notify on the score-completion event (or terminal failure).
      skipAddedNotification: true,
    })
    .catch((err) => {
      console.warn('[cc-sender] background handoff failed', err);
    });

  const successCopy = wantsScore
    ? 'Sent ✓ — scoring now.'
    : 'Sent ✓ — watch for a notification.';
  setStatus(sendStatus, successCopy, 'success');
  setSendingState(false);
  await clearPending();

  sendBtn.classList.add('hidden');
  if (dismissBtn) dismissBtn.classList.remove('hidden');
  if (!wantsScore && newJobPostId && postSendScoreBtn) {
    trackedJobPostId = newJobPostId;
    postSendScoreBtn.classList.remove('hidden');
  }
});

if (dismissBtn) dismissBtn.addEventListener('click', () => window.close());

// "Score this post" — POST /api/v1/scores/ with the JobPost relationship
// and surface a link to the score-detail page. No polling (per
// direction); user can refresh /job-posts/:id/scores/:score_id later to
// see the result. Shared between the tracked-panel button and the
// post-send button on the connected screen.
async function startScore(btn, statusEl) {
  if (!trackedJobPostId) return;
  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) {
    setStatus(statusEl, 'Not connected.', 'error');
    return;
  }
  btn.disabled = true;
  btn.dataset.state = 'sending';
  setStatus(statusEl, 'Starting score…');
  let resp;
  try {
    resp = await fetch(`${ORIGIN}/api/v1/scores/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${saved.ccApiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'score',
          relationships: {
            'job-post': {
              data: { type: 'job-post', id: String(trackedJobPostId) },
            },
          },
        },
      }),
    });
  } catch (err) {
    setStatus(statusEl, `Network error: ${err.message}`, 'error');
    btn.disabled = false;
    delete btn.dataset.state;
    return;
  }
  let body;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }
  if (!resp.ok) {
    const detail = body?.errors?.[0]?.detail || `HTTP ${resp.status}`;
    setStatus(statusEl, detail, 'error');
    btn.disabled = false;
    delete btn.dataset.state;
    return;
  }
  const scoreId = body?.data?.id;
  btn.classList.add('hidden');
  if (scoreId) {
    const url = `${FRONTEND_ORIGIN}/job-posts/${trackedJobPostId}/scores/${scoreId}`;
    statusEl.innerHTML = '';
    const label = document.createElement('span');
    label.textContent = 'Scoring started — ';
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'view progress';
    link.className = 'result-link';
    link.style.marginTop = '0';
    statusEl.appendChild(label);
    statusEl.appendChild(link);
    statusEl.classList.add('success');
  } else {
    setStatus(statusEl, 'Scoring started.', 'success');
  }
}

if (trackedScoreBtn) {
  trackedScoreBtn.addEventListener('click', () =>
    startScore(trackedScoreBtn, trackedScoreStatus),
  );
}
if (postSendScoreBtn) {
  postSendScoreBtn.addEventListener('click', () =>
    startScore(postSendScoreBtn, postSendScoreStatus),
  );
}

loadTheme();
loadSaved();
