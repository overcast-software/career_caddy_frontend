const ORIGIN = 'https://api.careercaddy.online';
const FRONTEND_ORIGIN = 'https://careercaddy.online';
const STORAGE_KEYS = ['ccApiKey', 'ccKeyId', 'ccUsername', 'ccAutoScore', 'ccPending', 'ccIsStaff'];
const PENDING_MAX_AGE_MS = 30_000;

// CC #46 — apply-attribution stash. When the user clicks "Apply & track"
// on a tracked JobPost we open its apply_url in a new tab and remember the
// source JobPost so that, if they later open the popup ON that ATS apply
// page (which has no direct JobPost match), we can still offer to track an
// application attributed to the original post. Keyed loosely by apply_url
// origin (ATS apply URLs redirect/append steps, so we match on origin, not
// exact URL). Small capped list; expired entries pruned on every read/write.
const CC_PENDING_APPLIES_KEY = 'ccPendingApplies';
const APPLY_STASH_MAX = 5;
const APPLY_STASH_TTL_MS = 6 * 60 * 60 * 1000; // 6h
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
const screenOnCc = $('screen-on-cc'); // CC #2: on-careercaddy dialogue
const onCcOpenEl = $('on-cc-open');
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

// --- CC #46: Track application (tracked screen) --------------------
// Full lookup result for the currently-tracked post (id/title/company +
// applyUrl/companyId/link), stashed by showTracked so trackApplication can
// build the JobApplication without a second lookup.
let trackedJobPost = null;
const trackApplyBtn = $('track-apply-btn');
const trackApplyStatus = $('track-apply-status');
const trackApplyLinkEl = $('track-apply-link');

// --- CC #46: Apply-attribution prompt (connected/Send screen) ------
const applyAttrCard = $('apply-attr-card');
const applyAttrTitleEl = $('apply-attr-title');
const applyAttrCompanyEl = $('apply-attr-company');
const applyAttrBtn = $('apply-attr-btn');
const applyAttrStatus = $('apply-attr-status');
const applyAttrLinkEl = $('apply-attr-link');
// The stash record currently surfaced on the attribution card (so the
// click handler knows which JobPost to attribute and which stash entry to
// clear). Null when no offer is showing.
let pendingApplyOffer = null;

// --- Staff Tools tab (is_staff only) -------------------------------
const tabBar = $('tab-bar');
const tabSendBtn = $('tab-send');
const tabToolsBtn = $('tab-tools');
const screenTools = $('screen-tools');
const toolHostEl = $('tool-host');
const enrichBtn = $('enrich-btn');
const enrichStatus = $('enrich-status');
const enrichLinkEl = $('enrich-link');
const whoToolsEl = $('who-tools');
const disconnectToolsBtn = $('disconnect-tools');
const themeToggleToolsBtn = $('theme-toggle-tools');

// "Proposed job-post" validator (staff Tools tab).
const ppRecheckBtn = $('pp-recheck');
const ppMsgEl = $('pp-msg');
const ppPreviewEl = $('pp-preview');
const ppTitleEl = $('pp-title');
const ppMetaEl = $('pp-meta');
const ppPostedEl = $('pp-posted');
const ppDescEl = $('pp-desc');
const ppFieldsEl = $('pp-fields');
const ppVerdictEl = $('pp-verdict');
const ppVerdictBadgeEl = $('pp-verdict-badge');
const ppTierEl = $('pp-tier');
const ppReasonsEl = $('pp-reasons');
const ppCreateBtn = $('pp-create');
const ppNoteEl = $('pp-note');
const ppCreateStatus = $('pp-create-status');
const ppCreateLinkEl = $('pp-create-link');

// Canonical job-post field order for the per-field validation list. Fields
// the profile configures but that aren't in this set are appended after.
const PROPOSED_FIELD_ORDER = [
  'title',
  'company_name',
  'location',
  'salary',
  'posted_date',
  'description',
];

// Latest extraction stashed for the "Create job-post" button. Set by
// renderProposedPost on every (re-)check; null until the first extraction.
let latestProposed = null;

// Staff gating + tab state. isStaff is hydrated from a cached flag on
// load and re-verified against /api/v1/me; the api enforces staff
// server-side on every tool call, so this only governs UI visibility.
let isStaff = false;
let activeTab = 'send';
let currentSendScreenEl = null; // screenConnected | screenTracked
let connectedName = '';

async function fetchStaffFlag(apiKey) {
  try {
    const resp = await fetch(`${ORIGIN}/api/v1/me/`, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!resp.ok) return false;
    const body = await resp.json();
    return body?.data?.attributes?.is_staff === true;
  } catch {
    return false;
  }
}

async function refreshStaffFlag(apiKey) {
  const staff = await fetchStaffFlag(apiKey);
  isStaff = staff;
  try {
    await api.storage.local.set({ ccIsStaff: staff });
  } catch {
    // best-effort cache; the live flag is authoritative this session
  }
  maybeShowTabBar();
  return staff;
}

function hideTabBar() {
  if (tabBar) tabBar.classList.add('hidden');
}

// The tab bar only appears for staff and only on a connected/tracked
// screen — never on connect/loading.
function maybeShowTabBar() {
  if (!tabBar) return;
  const onSendableScreen =
    currentSendScreenEl === screenConnected ||
    currentSendScreenEl === screenTracked;
  if (isStaff && onSendableScreen) {
    tabBar.classList.remove('hidden');
  } else {
    tabBar.classList.add('hidden');
  }
}

// Reset to the Send tab and refresh tab-bar visibility. Called whenever
// a send screen (connected/tracked) is shown.
function syncTabState() {
  activeTab = 'send';
  if (tabSendBtn) tabSendBtn.classList.add('active');
  if (tabToolsBtn) tabToolsBtn.classList.remove('active');
  maybeShowTabBar();
}

function setActiveTab(tab) {
  activeTab = tab;
  if (tab === 'tools') {
    // Hide EVERY send-area screen (incl. the loading skeleton) — not just
    // currentSendScreenEl, which is null until the popup-open lookup
    // resolves. Otherwise the skeleton bleeds through above the Tools panel.
    screenLoading.classList.add('hidden');
    screenConnect.classList.add('hidden');
    screenConnected.classList.add('hidden');
    screenTracked.classList.add('hidden');
    if (screenTools) screenTools.classList.remove('hidden');
    if (tabToolsBtn) tabToolsBtn.classList.add('active');
    if (tabSendBtn) tabSendBtn.classList.remove('active');
    showToolsScreen();
  } else {
    if (screenTools) screenTools.classList.add('hidden');
    // Back to Send: show whatever the lookup resolved to, or the skeleton
    // if it's still in flight.
    if (currentSendScreenEl) {
      currentSendScreenEl.classList.remove('hidden');
    } else {
      screenLoading.classList.remove('hidden');
    }
    if (tabSendBtn) tabSendBtn.classList.add('active');
    if (tabToolsBtn) tabToolsBtn.classList.remove('active');
  }
}

if (tabSendBtn)
  tabSendBtn.addEventListener('click', () => setActiveTab('send'));
if (tabToolsBtn)
  tabToolsBtn.addEventListener('click', () => setActiveTab('tools'));

// Populate the Tools tab when it opens: current host, who, page hints.
async function showToolsScreen() {
  if (whoToolsEl) whoToolsEl.textContent = connectedName || '';
  let host = '';
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) host = new URL(tab.url).hostname;
  } catch {
    // no active tab / restricted URL — leave host blank
  }
  if (toolHostEl) toolHostEl.textContent = host || '(no active tab)';
  setStatus(enrichStatus, '');
  hideEnrichLink();
  if (enrichBtn) {
    delete enrichBtn.dataset.state;
    enrichBtn.disabled = !host;
  }
  populateDevHints();
}

function hideEnrichLink() {
  if (!enrichLinkEl) return;
  enrichLinkEl.classList.add('hidden');
  enrichLinkEl.removeAttribute('href');
  enrichLinkEl.textContent = '';
}

function setEnrichSending(sending) {
  if (!enrichBtn) return;
  if (sending) {
    enrichBtn.dataset.state = 'sending';
    enrichBtn.disabled = true;
  } else {
    delete enrichBtn.dataset.state;
    enrichBtn.disabled = false;
  }
}

// Resolve the active host (and parent-domain fallbacks) to a
// ScrapeProfile id via the staff-only list filter. Mirrors the api's
// extension-selectors subdomain walk: exact host first, then strip the
// leftmost label until a profile matches. Returns {id, hostname},
// {forbidden:true}, or null (no profile for any candidate).
async function resolveProfileId(host, apiKey) {
  const norm = normalizeHostname(host);
  if (!norm) return null;
  const parts = norm.split('.');
  const candidates = [norm];
  for (let i = 1; i < parts.length - 1; i++) {
    candidates.push(parts.slice(i).join('.'));
  }
  for (const cand of candidates) {
    let resp;
    try {
      resp = await fetch(
        `${ORIGIN}/api/v1/scrape-profiles/?filter%5Bhostname%5D=${encodeURIComponent(
          cand,
        )}`,
        {
          headers: {
            Accept: 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );
    } catch {
      return null;
    }
    if (resp.status === 401 || resp.status === 403) {
      return { forbidden: true };
    }
    if (!resp.ok) continue;
    let body;
    try {
      body = await resp.json();
    } catch {
      continue;
    }
    const item = body?.data?.[0];
    if (item && item.id) {
      return {
        id: item.id,
        hostname: item.attributes?.hostname || cand,
      };
    }
  }
  return null;
}

// "Sharpen this domain's profile" — resolve host -> ScrapeProfile id,
// then POST /scrape-profiles/:id/sharpen/ (staff-only). The api enqueues
// a sharpen pass the offline enhancer picks up; this is a request, not a
// live agent run, so we surface the queued job id + a link to the
// profile rather than polling to completion.
async function handleEnrich() {
  hideEnrichLink();
  setEnrichSending(true);
  setStatus(enrichStatus, 'Resolving profile…');

  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) {
    setStatus(enrichStatus, 'Not connected.', 'error');
    setEnrichSending(false);
    return;
  }

  let host = '';
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) host = new URL(tab.url).hostname;
  } catch {
    // fall through to the no-host guard
  }
  if (!host) {
    setStatus(enrichStatus, 'No active tab to sharpen.', 'error');
    setEnrichSending(false);
    return;
  }

  const resolved = await resolveProfileId(host, saved.ccApiKey);
  if (resolved && resolved.forbidden) {
    setStatus(enrichStatus, 'Staff access required.', 'error');
    setEnrichSending(false);
    return;
  }
  if (!resolved) {
    setStatus(
      enrichStatus,
      `No ScrapeProfile for ${normalizeHostname(host)} yet — capture a scrape for this domain first.`,
      'error',
    );
    setEnrichSending(false);
    return;
  }

  setStatus(enrichStatus, 'Queuing sharpen…');
  let resp;
  try {
    // No request body — the sharpen action only needs the profile pk +
    // the staff user. Omit Content-Type so DRF never tries to parse an
    // empty body as JSON:API.
    resp = await fetch(
      `${ORIGIN}/api/v1/scrape-profiles/${resolved.id}/sharpen/`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${saved.ccApiKey}`,
        },
      },
    );
  } catch (err) {
    setStatus(enrichStatus, `Network error: ${err.message}`, 'error');
    setEnrichSending(false);
    return;
  }

  let body;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }

  if (resp.status === 401 || resp.status === 403) {
    setStatus(enrichStatus, 'Staff access required.', 'error');
    setEnrichSending(false);
    return;
  }
  if (resp.status === 422) {
    setStatus(
      enrichStatus,
      `No completed scrape for ${resolved.hostname} yet — use "Send this page", then sharpen once it's captured.`,
      'error',
    );
    setEnrichSending(false);
    return;
  }
  if (!resp.ok) {
    const detail = body?.errors?.[0]?.detail || `HTTP ${resp.status}`;
    setStatus(enrichStatus, `Error: ${detail}`, 'error');
    setEnrichSending(false);
    return;
  }

  const jobId = body?.meta?.job_id;
  setStatus(
    enrichStatus,
    `Sharpen queued for ${resolved.hostname}${jobId ? ` (job ${jobId})` : ''}.`,
    'success',
  );
  if (enrichLinkEl) {
    enrichLinkEl.href = `${FRONTEND_ORIGIN}/admin/scrape-profiles/${resolved.id}`;
    enrichLinkEl.textContent = 'Open profile';
    enrichLinkEl.classList.remove('hidden');
  }
  setEnrichSending(false);
}

if (enrichBtn) enrichBtn.addEventListener('click', handleEnrich);
// --- end Staff Tools tab -------------------------------------------

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
  if (themeToggleToolsBtn) themeToggleToolsBtn.innerHTML = icon;
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
if (themeToggleToolsBtn)
  themeToggleToolsBtn.addEventListener('click', toggleTheme);

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
  if (screenOnCc) screenOnCc.classList.add('hidden');
  if (screenTools) screenTools.classList.add('hidden');
}

function showLoading() {
  hideAllScreens();
  currentSendScreenEl = null;
  hideTabBar();
  screenLoading.classList.remove('hidden');
}

function showConnect(message = '') {
  hideAllScreens();
  currentSendScreenEl = null;
  hideTabBar();
  screenConnect.classList.remove('hidden');
  hideResultLink();
  setSendingState(false);
  setStatus(connectStatus, message);
}

// CC #2: true when the URL is a Career Caddy FRONTEND page (the app itself,
// not the API host). Used to suppress the capture form when the user opens
// the Sender while on careercaddy.online — there's nothing external to send.
function isCareerCaddyFrontendUrl(rawUrl) {
  try {
    return new URL(rawUrl).origin === FRONTEND_ORIGIN;
  } catch {
    return false;
  }
}

// CC #2: the active tab is Career Caddy itself (the user arrived from
// careercaddy, e.g. browsing job-posts). Show a contextual dialogue instead
// of the meaningless "Send this page" capture form.
function showOnCareerCaddy() {
  hideAllScreens();
  currentSendScreenEl = null;
  hideTabBar();
  if (onCcOpenEl) onCcOpenEl.href = `${FRONTEND_ORIGIN}/job-posts`;
  screenOnCc.classList.remove('hidden');
}

// DEV-ONLY hints preview helpers. Surfaces the hint values the popup
// would send so a selector miss is visible at-a-glance during dogfood.
// Strip before store submission.
function _setDevHint(elId, value) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (value) {
    el.textContent = value;
    el.title = value;
    el.classList.remove('empty');
  } else {
    el.textContent = '—';
    el.removeAttribute('title');
    el.classList.add('empty');
  }
}

// --- "Proposed job-post" validator render --------------------------
// Renders what the host's job_data selectors extract from the live DOM,
// shaped as a JobPost, with per-field validation + the server known-good
// verdict. All values come from the page DOM, so they are ALWAYS set via
// textContent (never innerHTML) — pickPrefill already trimmed them.

// Collapse the whole card to the message-only state. `msg` shows in the
// pp-msg slot; pass '' to hide it entirely.
function resetProposedPost(msg = 'Open a job page to preview.') {
  latestProposed = null;
  if (ppMsgEl) {
    ppMsgEl.textContent = msg;
    ppMsgEl.classList.toggle('hidden', !msg);
  }
  if (ppPreviewEl) ppPreviewEl.classList.add('hidden');
  if (ppFieldsEl) {
    ppFieldsEl.textContent = '';
    ppFieldsEl.classList.add('hidden');
  }
  if (ppVerdictEl) ppVerdictEl.classList.add('hidden');
  if (ppReasonsEl) {
    ppReasonsEl.textContent = '';
    ppReasonsEl.classList.add('hidden');
  }
  if (ppCreateBtn) ppCreateBtn.classList.add('hidden');
  if (ppNoteEl) ppNoteEl.classList.add('hidden');
  setStatus(ppCreateStatus, '');
  hidePpCreateLink();
}

function hidePpCreateLink() {
  if (!ppCreateLinkEl) return;
  ppCreateLinkEl.classList.add('hidden');
  ppCreateLinkEl.removeAttribute('href');
  ppCreateLinkEl.textContent = '';
}

// Render the known-good verdict badge + tier + reasons. Shared by the
// has-fields and no-job_data-selectors render paths.
function renderVerdict(hints) {
  if (ppVerdictBadgeEl) {
    const good = hints.known_good === true;
    ppVerdictBadgeEl.textContent = good ? '✓ known-good' : '✗ not known-good';
    ppVerdictBadgeEl.className = `pp-badge ${good ? 'good' : 'bad'}`;
  }
  if (ppTierEl) {
    ppTierEl.textContent = hints.tier ? `tier ${hints.tier}` : '';
  }
  if (ppVerdictEl) ppVerdictEl.classList.remove('hidden');

  if (ppReasonsEl) {
    ppReasonsEl.textContent = '';
    const reasons = Array.isArray(hints.reasons) ? hints.reasons : [];
    if (reasons.length) {
      for (const reason of reasons) {
        const li = document.createElement('li');
        li.textContent = reason;
        ppReasonsEl.appendChild(li);
      }
      ppReasonsEl.classList.remove('hidden');
    } else {
      ppReasonsEl.classList.add('hidden');
    }
  }
}

function renderProposedPost(hints, host) {
  // No ScrapeProfile resolved for this host (404 / parent-domain miss).
  if (!hints || !hints.has_selectors) {
    resetProposedPost(
      host ? `No ScrapeProfile for ${host}.` : 'No ScrapeProfile for this host.',
    );
    return;
  }

  const fieldList = Array.isArray(hints.prefill_fields)
    ? hints.prefill_fields
    : [];

  // Profile exists but configures no job_data selectors — still show the
  // verdict + reasons (the "why not known-good" detail).
  if (!fieldList.length) {
    if (ppMsgEl) {
      ppMsgEl.textContent =
        'No job_data selectors configured for this host.';
      ppMsgEl.classList.remove('hidden');
    }
    if (ppPreviewEl) ppPreviewEl.classList.add('hidden');
    if (ppFieldsEl) {
      ppFieldsEl.textContent = '';
      ppFieldsEl.classList.add('hidden');
    }
    if (ppCreateBtn) ppCreateBtn.classList.add('hidden');
    if (ppNoteEl) ppNoteEl.classList.add('hidden');
    setStatus(ppCreateStatus, '');
    hidePpCreateLink();
    renderVerdict(hints);
    latestProposed = null;
    return;
  }

  if (ppMsgEl) ppMsgEl.classList.add('hidden');

  // Index configured fields by name for the merged canonical-order list.
  const byField = new Map();
  for (const f of fieldList) byField.set(f.field, f);
  const matched = (name) => {
    const f = byField.get(name);
    return f && f.value ? f.value : null;
  };

  // --- job-post-shaped preview (configured fields only) ---
  const titleVal = matched('title');
  if (ppTitleEl) {
    ppTitleEl.textContent = titleVal || 'No title selector match';
    ppTitleEl.classList.toggle('empty', !titleVal);
  }
  const metaParts = [
    matched('company_name'),
    matched('location'),
    matched('salary'),
  ].filter(Boolean);
  if (ppMetaEl) {
    ppMetaEl.textContent = metaParts.join(' · ');
    ppMetaEl.classList.toggle('hidden', metaParts.length === 0);
  }
  const postedVal = matched('posted_date');
  if (ppPostedEl) {
    ppPostedEl.textContent = postedVal ? `Posted: ${postedVal}` : '';
    ppPostedEl.classList.toggle('hidden', !postedVal);
  }
  const descVal = matched('description');
  if (ppDescEl) {
    ppDescEl.textContent = descVal || '';
    ppDescEl.classList.toggle('hidden', !descVal);
  }
  if (ppPreviewEl) ppPreviewEl.classList.remove('hidden');

  // --- per-field validation list ---
  // Canonical order first, then any configured fields outside the set.
  const ordered = [];
  const seen = new Set();
  for (const name of PROPOSED_FIELD_ORDER) {
    ordered.push(name);
    seen.add(name);
  }
  for (const f of fieldList) {
    if (!seen.has(f.field)) {
      ordered.push(f.field);
      seen.add(f.field);
    }
  }
  if (ppFieldsEl) {
    ppFieldsEl.textContent = '';
    for (const name of ordered) {
      const f = byField.get(name);
      const row = document.createElement('div');
      row.className = 'pp-field';
      const mark = document.createElement('span');
      mark.className = 'pp-field-mark';
      const key = document.createElement('span');
      key.className = 'pp-field-key';
      key.textContent = name;
      const val = document.createElement('span');
      val.className = 'pp-field-val';
      if (!f || !f.configured) {
        mark.classList.add('na');
        mark.textContent = '—';
        val.classList.add('muted');
        val.textContent = 'not configured';
      } else if (f.value) {
        mark.classList.add('ok');
        mark.textContent = '✓';
        val.textContent = f.value;
        val.title = f.value;
      } else {
        mark.classList.add('miss');
        mark.textContent = '✗';
        val.classList.add('muted');
        val.textContent = f.invalid
          ? 'invalid selector'
          : 'no match on this page';
      }
      row.appendChild(mark);
      row.appendChild(key);
      row.appendChild(val);
      ppFieldsEl.appendChild(row);
    }
    ppFieldsEl.classList.remove('hidden');
  }

  // --- verdict ---
  renderVerdict(hints);

  // --- create gate: need title + company to seed a JobPost. Description
  // comes from the full page text at create time (matches the send path). ---
  const company = matched('company_name');
  const canCreate = !!(titleVal && company);
  latestProposed = {
    host: host || '',
    prefill: hints.structured_prefill || null,
    applyUrl: hints.apply_url || null,
    canonical: hints.canonical_link_hint || null,
    referrer: hints.referrer_url || null,
    canCreate,
  };
  if (ppCreateBtn) {
    ppCreateBtn.classList.remove('hidden');
    ppCreateBtn.disabled = !canCreate;
  }
  if (ppNoteEl) ppNoteEl.classList.remove('hidden');
  setStatus(
    ppCreateStatus,
    canCreate ? '' : 'Needs a title and company match to create.',
    canCreate ? 'info' : 'error',
  );
  hidePpCreateLink();
}

// Populate the single staff Tools-tab hints block (canonical / apply /
// referrer) from the active page. Display-only — the apply_url backfill
// that used to ride along here now lives in maybeBackfillApplyUrl so it
// fires on the tracked screen regardless of which tab is active.
async function populateDevHints() {
  _setDevHint('dev-hint-canonical', null);
  _setDevHint('dev-hint-apply', null);
  _setDevHint('dev-hint-referrer', null);
  resetProposedPost();
  let saved;
  try {
    saved = await api.storage.local.get(['ccApiKey']);
  } catch {
    return;
  }
  if (!saved.ccApiKey) return;
  let tab;
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    return;
  }
  if (!tab || !tab.id || !tab.url) return;
  let host;
  try {
    host = new URL(tab.url).hostname;
  } catch {
    return;
  }
  let hints;
  try {
    hints = await grabHints(tab.id, host, saved.ccApiKey);
  } catch {
    return;
  }
  _setDevHint('dev-hint-canonical', hints.canonical_link_hint);
  _setDevHint('dev-hint-apply', hints.apply_url);
  _setDevHint('dev-hint-referrer', hints.referrer_url);
  renderProposedPost(hints, normalizeHostname(host));
}

// Passive backfill: when the active page exposes an apply URL for a JP
// that's already in the library, PATCH it onto the JP. Single-channel
// apply_url storage means the api accepts the value via a straight
// JSON:API PATCH — no verb endpoint. Idempotent; the api may no-op when
// apply_url is already set. Fires from showTracked, independent of the
// staff Tools tab (where the hints are now displayed).
async function maybeBackfillApplyUrl() {
  if (!trackedJobPostId) return;
  let saved;
  try {
    saved = await api.storage.local.get(['ccApiKey']);
  } catch {
    return;
  }
  if (!saved.ccApiKey) return;
  let tab;
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    return;
  }
  if (!tab || !tab.id || !tab.url) return;
  let host;
  try {
    host = new URL(tab.url).hostname;
  } catch {
    return;
  }
  let hints;
  try {
    hints = await grabHints(tab.id, host, saved.ccApiKey);
  } catch {
    return;
  }
  if (!hints.apply_url) return;
  try {
    await fetch(`${ORIGIN}/api/v1/job-posts/${trackedJobPostId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${saved.ccApiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'job-post',
          id: String(trackedJobPostId),
          attributes: { apply_url: hints.apply_url },
        },
      }),
    });
  } catch (err) {
    console.warn('[cc-sender] apply_url backfill PATCH failed', err);
  }
}

function showConnected(name, incompleteTarget = null) {
  hideAllScreens();
  screenConnected.classList.remove('hidden');
  whoEl.textContent = name || '';
  connectedName = name || '';
  currentSendScreenEl = screenConnected;
  hideResultLink();
  setSendingState(false);
  setStatus(sendStatus, '');
  resetApplyAttributionCard(); // CC #46: hidden unless a stash match offers it
  syncTabState();

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

function showTracked(found, name) {
  const { id, title, company, topScore, hasPendingScore } = found;
  hideAllScreens();
  screenTracked.classList.remove('hidden');
  trackedJobPostId = id;
  trackedJobPost = found; // CC #46: full lookup result for Track application
  connectedName = name || '';
  currentSendScreenEl = screenTracked;
  maybeBackfillApplyUrl();
  refreshApplicationState(); // CC #46: dedupe-on-render (Track vs Open)
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
  syncTabState();
}

async function lookupExistingJobPost(tabUrl, apiKey) {
  if (!tabUrl) return null;
  const verdict = classifyUrl(tabUrl);
  if (!verdict.ok) return null;
  let resp;
  // Bound the lookup so the popup's loading skeleton can't hang forever on a
  // slow/stuck request — on timeout we abort and fall back to the Send UI.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const url =
      `${ORIGIN}/api/v1/job-posts/?filter%5Blink%5D=${encodeURIComponent(tabUrl)}` +
      `&include=company,scores`;
    resp = await fetch(url, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: ctrl.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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
    // CC #46: company id + apply_url + canonical link, used by the
    // Track-application action and the apply-attribution stash.
    companyId: companyRel ? String(companyRel.id) : null,
    applyUrl: attrs.apply_url || null,
    link: attrs.link || null,
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
  let tab;
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    showConnected(name);
    return;
  }
  if (!tab || !tab.url) {
    showConnected(name);
    return;
  }
  // CC #2: if the active tab is Career Caddy itself, never show the capture
  // form — surface the on-Career-Caddy dialogue instead.
  if (isCareerCaddyFrontendUrl(tab.url)) {
    showOnCareerCaddy();
    return;
  }
  try {
    const { ccPending } = await api.storage.local.get(['ccPending']);
    if (
      ccPending &&
      ccPending.url === tab.url &&
      Date.now() - ccPending.startedAt < PENDING_MAX_AGE_MS
    ) {
      showSending(name);
      return;
    }
  } catch {
    // fall through to the optimistic Send UI
  }
  // Show the Send UI IMMEDIATELY rather than blocking the popup on the
  // library lookup, which can take several seconds. Run the lookup in the
  // background and upgrade to the Tracked / resend screen when it returns —
  // but only if the user is still on the Send tab, so a late result never
  // yanks them off the Tools tab.
  showConnected(name);
  lookupExistingJobPost(tab.url, apiKey)
    .then((found) => {
      if (activeTab !== 'send') return;
      if (!found) {
        // No direct JobPost match. CC #46 bonus: the active tab may be an
        // ATS apply page opened via "Apply & track" on the source post —
        // consult the apply-attribution stash and offer to track it.
        maybeOfferApplyAttribution(tab.url, name);
        return;
      }
      if (found.complete) {
        // Already in the library + complete — switch to the Open/Tracked UI.
        showTracked(found, name);
      } else {
        // Exists but flagged !complete (cc_auto stub, user-flagged, or a
        // rejected scrape) — render the resend variant (banner + Resend).
        showConnected(name, found);
      }
    })
    .catch(() => {});
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
    // Cached staff flag gates the Tools tab instantly; refreshStaffFlag
    // re-verifies against /api/v1/me in the background below.
    isStaff = saved.ccIsStaff === true;
    if (saved.ccApiKey && saved.ccKeyId) {
      // Show the skeleton while the popup-open lookup resolves; resolveOpenScreen
      // swaps to either Tracked (URL already in library) or Connected (Send UI).
      // Single network request, popup-open only — never on tab change.
      showLoading();
      resolveOpenScreen(saved.ccApiKey, saved.ccUsername);
      refreshStaffFlag(saved.ccApiKey);
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
        refreshStaffFlag(ssoResult.apiKey);
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
  if (disconnectBtn) disconnectBtn.disabled = true;
  if (disconnectTrackedBtn) disconnectTrackedBtn.disabled = true;
  if (disconnectToolsBtn) disconnectToolsBtn.disabled = true;
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
    'ccIsStaff',
    'ccExtensionSelectorCache',
  ]);
  isStaff = false;
  if (disconnectBtn) disconnectBtn.disabled = false;
  if (disconnectTrackedBtn) disconnectTrackedBtn.disabled = false;
  if (disconnectToolsBtn) disconnectToolsBtn.disabled = false;
  showConnect();
}

disconnectBtn.addEventListener('click', handleDisconnect);
disconnectTrackedBtn.addEventListener('click', handleDisconnect);
if (disconnectToolsBtn)
  disconnectToolsBtn.addEventListener('click', handleDisconnect);

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

// Cross-platform dedup hints: per-host selectors live on the api in
// ScrapeProfile.extension_selectors. The popup fetches them lazily on
// send via GET /scrape-profiles/extension-selectors/?hostname=, caches
// per-host in chrome.storage with a TTL, and falls back to baked
// LinkedIn defaults when the api is unreachable or no profile exists.
// All extractors are null-safe — a layout shift or DNS hiccup never
// blocks a send.

// Universal referrer allowlist; not per-host. Keeps the api round-trip
// out of the path that filters useless referrers (Hacker News, Gmail).
const REFERRER_HOSTS_LIST = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'ziprecruiter.com',
];

// Baked fallback so a fresh install, an api outage, or a host with no
// profile still gets the LinkedIn extraction the 1.2.0 release shipped.
// Keep the shape identical to what the api returns.
const BAKED_EXTENSION_SELECTORS = {
  'linkedin.com': {
    // LinkedIn's current job DOM ships hashed atomic class names that
    // rotate on every release (the old `jobs-apply-button` class is
    // gone). Anchor to the accessibility contract (aria-label) and the
    // safety/go wrapper href instead — both are stable surfaces.
    apply_button_selectors: [
      'a[aria-label="Apply on company website"][href]',
      'a[aria-label^="Apply on" i][href]',
      'a[href*="linkedin.com/safety/go/"][target="_blank"]',
    ],
    // LinkedIn's <head> ships no og:url / link[rel=canonical] — the
    // canonical URL is JS-constructed for the share-menu. But the
    // rendered job page DOM has multiple plain anchors pointing at the
    // canonical `/jobs/view/<id>/` path (On-site / Full-time pills,
    // View job post link). First match wins; pickMetaContent falls
    // back to `href` for non-meta elements.
    canonical_link_selectors: [
      'a[href^="https://www.linkedin.com/jobs/view/"][href$="/"]',
      'meta[property="og:url"]',
      'link[rel="canonical"]',
    ],
    apply_url_decoder: 'linkedin_safety_go',
    // Structured-prefill selectors: keep in sync with the
    // 0093_seed_linkedin_job_data_selectors migration. The api ships
    // these by default; the baked copy fires only when the api is
    // unreachable.
    job_data_selectors: {
      title: 'h1',
      company_name: "a[href*='/company/']",
    },
  },
};

// Named decoders the api references by string in apply_url_decoder. The
// extension owns the JS; the api just ships a name so a profile mutation
// never lets the api execute arbitrary code in the popup. New hosts with
// novel apply-link wrappers add a new entry here and a new value in the
// api's seed migration.
const DECODERS = {
  linkedin_safety_go: (href, baseHref) => {
    try {
      const parsed = new URL(href, baseHref);
      if (
        parsed.hostname.endsWith('linkedin.com') &&
        parsed.pathname.startsWith('/safety/go')
      ) {
        const dest = parsed.searchParams.get('url');
        return dest || null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  },
  passthrough: (href, baseHref) => {
    try {
      return new URL(href, baseHref).toString();
    } catch {
      return null;
    }
  },
};

const SELECTOR_CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const SELECTOR_CACHE_KEY = 'ccExtensionSelectorCache';

function normalizeHostname(host) {
  if (!host) return '';
  const lower = host.toLowerCase();
  return lower.startsWith('www.') ? lower.slice(4) : lower;
}

async function readSelectorCache(host) {
  const { [SELECTOR_CACHE_KEY]: cache = {} } = await api.storage.local.get(
    SELECTOR_CACHE_KEY,
  );
  const entry = cache[host];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > SELECTOR_CACHE_TTL_MS) return null;
  return entry.value; // {value} is either {selectors} or {missing: true}
}

async function writeSelectorCache(host, value) {
  const { [SELECTOR_CACHE_KEY]: cache = {} } = await api.storage.local.get(
    SELECTOR_CACHE_KEY,
  );
  cache[host] = { fetchedAt: Date.now(), value };
  return api.storage.local.set({ [SELECTOR_CACHE_KEY]: cache });
}

// Fetch (with cache) the per-host extension selector bundle. Returns
// either the api/baked selectors object, or null when the host has no
// known config — caller skips apply/canonical extraction but still runs
// the universal referrer check.
async function loadExtensionSelectors(host, apiKey) {
  const norm = normalizeHostname(host);
  if (!norm) return null;
  const cached = await readSelectorCache(norm);
  if (cached) {
    return cached.missing ? null : cached.selectors;
  }
  let resp;
  try {
    resp = await fetch(
      `${ORIGIN}/api/v1/scrape-profiles/extension-selectors/?hostname=${encodeURIComponent(
        norm,
      )}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
  } catch (err) {
    console.warn('[cc-sender] selector fetch failed', err);
    // Network failure — try baked default but don't cache the miss so
    // we retry next time.
    return BAKED_EXTENSION_SELECTORS[norm] || null;
  }
  if (resp.status === 404) {
    // No api-side profile for this host; baked default if we have one,
    // else nothing. Cache the miss so we don't refetch every send.
    const baked = BAKED_EXTENSION_SELECTORS[norm] || null;
    await writeSelectorCache(norm, baked ? { selectors: baked } : { missing: true });
    return baked;
  }
  if (!resp.ok) {
    console.warn('[cc-sender] selector fetch non-200', resp.status);
    return BAKED_EXTENSION_SELECTORS[norm] || null;
  }
  let body;
  try {
    body = await resp.json();
  } catch {
    return BAKED_EXTENSION_SELECTORS[norm] || null;
  }
  const attrs = body?.data?.attributes;
  if (!attrs) {
    return BAKED_EXTENSION_SELECTORS[norm] || null;
  }
  const selectors = {
    apply_button_selectors: attrs.apply_button_selectors || [],
    canonical_link_selectors: attrs.canonical_link_selectors || [],
    apply_url_decoder: attrs.apply_url_decoder || null,
    // Structured-prefill: per-field selectors the popup runs against
    // the active tab DOM to ship a {title, company_name, ...} dict
    // alongside the raw text. Treat null/non-dict as empty so a stale
    // cache or a host without the field still flows through.
    job_data_selectors:
      attrs.job_data_selectors && typeof attrs.job_data_selectors === 'object'
        ? attrs.job_data_selectors
        : {},
    // Server-vouched signals (api PR #185): top-level siblings of `data`
    // on the extension-selectors response, additive to the existing
    // shape. `known_good` (bool) gates the extension-direct fast path on
    // the domain's ScrapeProfile being complete; `tier` is the curation
    // tier ("0" | "auto" | "1" | "2" | "3"). Both are absent on an api
    // that hasn't deployed #185 — default known_good to false so a
    // missing signal falls back to the client-side presence heuristic
    // (no regression). Cached INSIDE `selectors`, so both ride the
    // existing per-host TTL with no separate cache key.
    known_good: body.known_good === true,
    tier: typeof body.tier === 'string' ? body.tier : null,
    // `reasons` (api PR #189): array of the per-clause known-good failures
    // ("missing job_data selectors: …", "scrape_count=1 < 3", …), empty when
    // known-good. OPTIONAL / graceful — absent until #189 deploys, so guard
    // with Array.isArray and fall back to null (the verdict still renders
    // from `known_good`/`tier` alone). Cached inside `selectors`, rides the
    // existing per-host TTL.
    reasons: Array.isArray(body.reasons) ? body.reasons : null,
  };
  await writeSelectorCache(norm, { selectors });
  return selectors;
}

// Top-frame-only extractors. Selectors come from the api/baked config;
// raw hrefs come back to the popup where the named decoder runs. Two
// reasons the decoder lives in popup context, not page context:
//   1. Decoder code is owned by the extension, not shipped from api —
//      keeps the api from being able to execute code in active tabs.
//   2. The popup carries the DECODERS registry; the injected `func`
//      must be self-contained and can't close over module-scope.
async function grabHints(tabId, hostname, apiKey) {
  const empty = {
    apply_url: null,
    canonical_link_hint: null,
    referrer_url: null,
    structured_prefill: null,
    prefill_fields: [],
    has_selectors: false,
    known_good: false,
    tier: null,
    reasons: null,
  };
  const selectors = await loadExtensionSelectors(hostname, apiKey);
  const applySelectors = (selectors && selectors.apply_button_selectors) || [];
  const canonicalSelectors =
    (selectors && selectors.canonical_link_selectors) || [];
  const decoderName =
    (selectors && selectors.apply_url_decoder) || 'passthrough';
  const decoder = DECODERS[decoderName] || DECODERS.passthrough;
  const jobDataSelectors =
    (selectors && selectors.job_data_selectors) || {};
  // Server known-good signal for this host (see loadExtensionSelectors).
  // Defaults to false for the baked-fallback / 404 / fetch-fail / old-api
  // cases — anything but an explicit server `true` falls back.
  const knownGood = !!(selectors && selectors.known_good === true);
  const tier = (selectors && selectors.tier) || null;
  const reasons =
    selectors && Array.isArray(selectors.reasons) ? selectors.reasons : null;
  const hasSelectors = !!selectors;

  let raw;
  try {
    const results = await api.scripting.executeScript({
      target: { tabId },
      args: [
        applySelectors,
        canonicalSelectors,
        REFERRER_HOSTS_LIST,
        jobDataSelectors,
      ],
      func: (applySels, canonicalSels, referrerHosts, jobDataSels) => {
        function pickHref(selectors) {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.getAttribute('href')) {
              return el.getAttribute('href');
            }
          }
          return null;
        }
        function pickMetaContent(selectors) {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            const content =
              el && (el.getAttribute('content') || el.getAttribute('href'));
            if (content) return content;
          }
          return null;
        }
        function pickReferrer() {
          const ref = document.referrer;
          if (!ref) return null;
          try {
            const parsed = new URL(ref);
            const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
            const allowed = referrerHosts.some(
              (h) => host === h || host.endsWith('.' + h),
            );
            if (!allowed) return null;
            // LinkedIn's safety/go interstitial (and similar cross-origin
            // redirects) strips the path on the way out, leaving only the
            // bare origin as document.referrer. A bare-origin referrer
            // carries no JP-binding info — every cross-platform submit
            // referred via LinkedIn would otherwise bind to the same
            // useless stub at https://www.linkedin.com/. Drop it client-
            // side so the api never sees the signal.
            if (!parsed.pathname || parsed.pathname === '/') return null;
            return ref;
          } catch {
            return null;
          }
        }
        // Returns BOTH the flat matched-values dict (structured_prefill —
        // shape the send path + api depend on, unchanged) and a per-field
        // validation array {field, configured, value, invalid} the staff
        // proposed-post card renders. One querySelector pass feeds both.
        function pickPrefill(selectorMap) {
          if (!selectorMap || typeof selectorMap !== 'object') {
            return { values: null, fields: [] };
          }
          const values = {};
          const fields = [];
          for (const [field, sel] of Object.entries(selectorMap)) {
            if (!sel || typeof sel !== 'string') {
              fields.push({ field, configured: false, value: null });
              continue;
            }
            let el = null;
            let invalid = false;
            try {
              el = document.querySelector(sel);
            } catch {
              invalid = true;
            }
            if (invalid) {
              fields.push({ field, configured: true, value: null, invalid: true });
              continue;
            }
            if (!el) {
              fields.push({ field, configured: true, value: null });
              continue;
            }
            const text = (el.innerText || el.textContent || '').trim();
            if (text) values[field] = text;
            fields.push({ field, configured: true, value: text || null });
          }
          return {
            values: Object.keys(values).length ? values : null,
            fields,
          };
        }
        const prefillResult = pickPrefill(jobDataSels);
        return {
          applyHref: pickHref(applySels),
          canonicalHref: pickMetaContent(canonicalSels),
          referrerHref: pickReferrer(),
          baseHref: location.href,
          prefill: prefillResult.values,
          prefillFields: prefillResult.fields,
        };
      },
    });
    raw = results && results[0] && results[0].result;
  } catch (err) {
    console.warn('[cc-sender] executeScript failed', err);
    // Restricted page — DOM unreadable. Still carry the server verdict +
    // whether a profile exists so the card can message sensibly.
    return { ...empty, has_selectors: hasSelectors, known_good: knownGood, tier, reasons };
  }
  if (!raw)
    return { ...empty, has_selectors: hasSelectors, known_good: knownGood, tier, reasons };
  const applyDecoded = raw.applyHref ? decoder(raw.applyHref, raw.baseHref) : null;
  let canonicalDecoded = null;
  if (raw.canonicalHref) {
    try {
      canonicalDecoded = new URL(raw.canonicalHref, raw.baseHref).toString();
    } catch {
      canonicalDecoded = null;
    }
  }
  return {
    apply_url: applyDecoded,
    canonical_link_hint: canonicalDecoded,
    referrer_url: raw.referrerHref || null,
    structured_prefill: raw.prefill || null,
    prefill_fields: Array.isArray(raw.prefillFields) ? raw.prefillFields : [],
    has_selectors: hasSelectors,
    known_good: knownGood,
    tier,
    reasons,
  };
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
  let hints = {
    apply_url: null,
    canonical_link_hint: null,
    referrer_url: null,
    structured_prefill: null,
  };
  try {
    const [tab2] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab2 && tab2.id && tab2.url) {
      const host = new URL(tab2.url).hostname;
      hints = await grabHints(tab2.id, host, saved.ccApiKey);
    }
  } catch (err) {
    console.warn('[cc-sender] hint extraction failed', err);
  }

  setStatus(sendStatus, 'Sending…');

  const wantsScore = autoScoreBox.checked;

  // Phase C / known-good gate (v1.4.0). The curated per-host
  // job_data_selectors are surfaced as structured_prefill; the page body
  // is the description. When BOTH title AND company_name AND a non-empty
  // description are present, we have everything the JobPost write path
  // needs without the server-side browser tier — take the
  // extension-direct fast path: POST a Scrape with
  // source_mode=extension-direct + captured_payload, and the scrape
  // graph short-circuits straight to PersistJobPost (Phase B).
  const directTitle = hints.structured_prefill?.title || '';
  const directCompany = hints.structured_prefill?.company_name || '';
  const directDescription = payload.text || '';
  const curatedComplete =
    directTitle.trim().length > 0 &&
    directCompany.trim().length > 0 &&
    directDescription.trim().length > 0;

  // The fast path is now gated on the SERVER's per-domain known-good
  // signal (api PR #185, top-level `known_good` on the extension-selectors
  // response) rather than purely on client-side presence.
  //
  //  - known_good === true → the api vouches that this domain's
  //    ScrapeProfile is complete. Trust the curated job_data_selectors:
  //    a complete curated extraction takes the extension-direct fast
  //    path. This is the behavior meant to land once the ScrapeProfile is
  //    complete for the invoked domain.
  //
  //  - known_good false / absent (an api without #185) / selectors fetch
  //    failed → fall back to v1.3.0 behavior UNCHANGED: the client-side
  //    presence heuristic still drives a direct-POST when all three are
  //    present, else /scrapes/from-text/. No regression for
  //    non-known-good domains, and the extension stays correct deployed
  //    ahead of #185 (missing known_good is treated as false — see
  //    grabHints / loadExtensionSelectors defaults).
  //
  // Both arms currently admit the same hosts (the no-regression mandate
  // keeps the not-known-good arm on the presence heuristic), so each
  // resolves the decision to `curatedComplete`. They are kept distinct so
  // the gate decision is observable while dogfooding the unpacked build,
  // and so the not-known-good arm can later be tightened to from-text-only
  // once #185 is universally deployed — without touching the wiring.
  // Trust presence, iterate — no validator threshold at v1 (Doug's baked
  // decision on the plan node).
  const serverVouched = hints.known_good === true;
  let useDirectPost;
  if (serverVouched) {
    useDirectPost = curatedComplete;
    console.debug('[cc-sender] known-good fast-path gate', {
      tier: hints.tier,
      curatedComplete,
      useDirectPost,
    });
  } else {
    useDirectPost = curatedComplete;
    console.debug('[cc-sender] fallback presence gate (not known-good)', {
      knownGood: hints.known_good,
      curatedComplete,
      useDirectPost,
    });
  }

  let resp;
  try {
    if (useDirectPost) {
      // The api's apply_url + canonical_link_hint + referrer_url live
      // outside captured_payload today (the from-text endpoint reads
      // them as top-level kwargs). For the direct-POST path, fold
      // apply_url and location (when we get one) into captured_payload
      // and ship the remaining dedup hints (canonical_link_hint,
      // referrer_url, structured_prefill) under extraction_hints so
      // the graph can reuse them on the bias-toward-canonical merge.
      const capturedPayload = {
        title: directTitle,
        company: directCompany,
        description: directDescription,
      };
      if (hints.apply_url) capturedPayload.apply_url = hints.apply_url;
      // location: structured_prefill doesn't carry location at v1 —
      // when the per-host selectors start shipping a `location` key,
      // it flows through structured_prefill.location automatically.
      const directLocation = hints.structured_prefill?.location || '';
      if (directLocation.trim().length > 0) {
        capturedPayload.location = directLocation;
      }
      const extractionHints = {};
      if (hints.canonical_link_hint) {
        extractionHints.canonical_link_hint = hints.canonical_link_hint;
      }
      if (hints.referrer_url) {
        extractionHints.referrer_url = hints.referrer_url;
      }
      if (hints.structured_prefill) {
        extractionHints.structured_prefill = hints.structured_prefill;
      }
      if (Object.keys(extractionHints).length > 0) {
        capturedPayload.extraction_hints = extractionHints;
      }
      resp = await fetch(`${ORIGIN}/api/v1/scrapes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${saved.ccApiKey}`,
        },
        body: JSON.stringify({
          data: {
            type: 'scrape',
            attributes: {
              url: payload.url,
              link: payload.url,
              source_mode: 'extension-direct',
              captured_payload: capturedPayload,
            },
          },
        }),
      });
    } else {
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
          apply_url: hints.apply_url,
          canonical_link_hint: hints.canonical_link_hint,
          referrer_url: hints.referrer_url,
          structured_prefill: hints.structured_prefill,
        }),
      });
    }
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

  // api PR #171 mirrors data.id onto meta.scrape_id as a defensive
  // fallback channel; read data.id first, fall back to meta.scrape_id.
  const scrapeId = body?.data?.id || body?.meta?.scrape_id;
  if (!scrapeId) {
    setStatus(
      sendStatus,
      'Sent. Network response was malformed; check `/job-posts`.',
      'error',
    );
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
  // should actually land — when LinkedIn is submitted with apply_url
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

// "Create job-post" (staff Tools tab) — promote the validated extraction to
// a real post via the SAME extension-direct scrape-create path the Send
// button uses (POST /scrapes/ source_mode=extension-direct + captured_payload,
// so the scrape graph short-circuits to PersistJobPost). title/company come
// from the validated job_data selectors stashed by renderProposedPost;
// description is the full page text, read at click time to mirror the send
// path exactly. Self-contained so the 335-line send handler stays untouched.
async function createFromProposed() {
  if (!latestProposed || !latestProposed.canCreate) return;
  setStatus(ppCreateStatus, 'Reading page…');
  hidePpCreateLink();
  if (ppCreateBtn) {
    ppCreateBtn.dataset.state = 'sending';
    ppCreateBtn.disabled = true;
  }

  const finish = () => {
    if (ppCreateBtn) {
      delete ppCreateBtn.dataset.state;
      ppCreateBtn.disabled = false;
    }
  };

  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) {
    setStatus(ppCreateStatus, 'Not connected.', 'error');
    finish();
    return;
  }

  let tab;
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    tab = null;
  }
  if (!tab || !tab.id || !tab.url) {
    setStatus(ppCreateStatus, 'No active tab to create from.', 'error');
    finish();
    return;
  }
  const verdict = classifyUrl(tab.url);
  if (!verdict.ok) {
    setStatus(ppCreateStatus, verdict.message, 'error');
    finish();
    return;
  }

  let payload;
  try {
    payload = await grabPayload(tab.id);
  } catch (err) {
    setStatus(ppCreateStatus, err.message, 'error');
    finish();
    return;
  }
  if (!payload || !payload.text) {
    setStatus(ppCreateStatus, 'Page read blocked (restricted URL?).', 'error');
    finish();
    return;
  }

  const prefill = latestProposed.prefill || {};
  const capturedPayload = {
    title: prefill.title || '',
    company: prefill.company_name || '',
    description: payload.text,
  };
  if (latestProposed.applyUrl) {
    capturedPayload.apply_url = latestProposed.applyUrl;
  }
  if (prefill.location) capturedPayload.location = prefill.location;
  const extractionHints = {};
  if (latestProposed.canonical) {
    extractionHints.canonical_link_hint = latestProposed.canonical;
  }
  if (latestProposed.referrer) {
    extractionHints.referrer_url = latestProposed.referrer;
  }
  if (latestProposed.prefill) {
    extractionHints.structured_prefill = latestProposed.prefill;
  }
  if (Object.keys(extractionHints).length > 0) {
    capturedPayload.extraction_hints = extractionHints;
  }

  setStatus(ppCreateStatus, 'Creating…');
  let resp;
  try {
    resp = await fetch(`${ORIGIN}/api/v1/scrapes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${saved.ccApiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'scrape',
          attributes: {
            url: payload.url,
            link: payload.url,
            source_mode: 'extension-direct',
            captured_payload: capturedPayload,
          },
        },
      }),
    });
  } catch (err) {
    setStatus(ppCreateStatus, `Network error: ${err.message}`, 'error');
    finish();
    return;
  }

  if (resp.status === 401 || resp.status === 403) {
    setStatus(ppCreateStatus, 'Session expired — reconnect required.', 'error');
    finish();
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
    const existingId = meta.job_post_id;
    if (existingId && ppCreateLinkEl) {
      ppCreateLinkEl.href = `${FRONTEND_ORIGIN}/job-posts/${existingId}`;
      ppCreateLinkEl.textContent = 'View existing post';
      ppCreateLinkEl.classList.remove('hidden');
    }
    setStatus(ppCreateStatus, 'Already in your library.', 'success');
    finish();
    return;
  }

  if (!resp.ok) {
    const detail = body?.errors?.[0]?.detail || `HTTP ${resp.status}`;
    setStatus(ppCreateStatus, `Error: ${detail}`, 'error');
    finish();
    return;
  }

  const newJobPostId =
    body?.data?.relationships?.['job-post']?.data?.id || null;
  const canonicalRedirect = body?.meta?.canonical_redirect || null;
  const landingId = canonicalRedirect || newJobPostId;
  if (landingId && ppCreateLinkEl) {
    ppCreateLinkEl.href = `${FRONTEND_ORIGIN}/job-posts/${landingId}`;
    ppCreateLinkEl.textContent = 'View job post';
    ppCreateLinkEl.classList.remove('hidden');
  }
  setStatus(ppCreateStatus, 'Created ✓', 'success');
  if (ppCreateBtn) {
    delete ppCreateBtn.dataset.state;
    ppCreateBtn.classList.add('hidden');
  }
}

if (ppCreateBtn) ppCreateBtn.addEventListener('click', createFromProposed);
// "Re-check" re-applies the host's selectors against the CURRENT DOM (SPA
// nav) — re-runs the full Tools-tab extraction (dedup hints + proposed post).
if (ppRecheckBtn)
  ppRecheckBtn.addEventListener('click', async () => {
    // Re-check forces a fresh selector fetch (bypass the 1h per-host
    // ccExtensionSelectorCache) so a just-sharpened / just-edited profile
    // is reflected immediately instead of after the TTL.
    try {
      await api.storage.local.remove(SELECTOR_CACHE_KEY);
    } catch {
      // best-effort; fall through and re-run with whatever's cached
    }
    populateDevHints();
  });

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

// ===================================================================
// CC #46 — Track application (jp -> ja)
// Self-contained region: turns a tracked JobPost into a JobApplication
// via the api's existing POST /job-applications/ + dedupe sub-collection.
// Mirrors the established raw-fetch write idiom (createFromProposed /
// startScore). NOTE: this is the MV3 extension, not the Ember app —
// raw fetch + plain JS arrays (.filter/.sort/.slice) are correct here.
// ===================================================================

// --- Shared api helpers --------------------------------------------

// Owner-scoped dedupe: GET /job-posts/:id/job-applications/ returns this
// user's applications for that post. Returns { appId } (first existing app
// id, or null) or { error: true } on a network/parse failure.
async function findExistingApplication(jobPostId, apiKey) {
  let resp;
  try {
    resp = await fetch(
      `${ORIGIN}/api/v1/job-posts/${jobPostId}/job-applications/`,
      {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
  } catch {
    return { error: true };
  }
  if (!resp.ok) return { error: true };
  let body;
  try {
    body = await resp.json();
  } catch {
    return { error: true };
  }
  const first = body && Array.isArray(body.data) ? body.data[0] : null;
  return { appId: first ? first.id : null };
}

// POST a JobApplication. company_id is inherited from the job_post
// server-side (JobApplicationViewSet.pre_save_payload), so we send only the
// job-post relationship — exactly matching the api's own create test. Type
// is the dasherized resource type "job-application"; attributes are
// snake_case. Returns { ok, appId } or { ok:false, error }.
async function postJobApplication({ jobPostId, trackingUrl, apiKey }) {
  let resp;
  try {
    resp = await fetch(`${ORIGIN}/api/v1/job-applications/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'job-application',
          attributes: {
            status: 'Applied',
            applied_at: new Date().toISOString(),
            tracking_url: trackingUrl || null,
          },
          relationships: {
            'job-post': {
              data: { type: 'job-post', id: String(jobPostId) },
            },
          },
        },
      }),
    });
  } catch (err) {
    return { ok: false, error: `Network error: ${err.message}` };
  }
  if (resp.status === 401 || resp.status === 403) {
    return { ok: false, error: 'Session expired — reconnect required.' };
  }
  let body;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }
  if (!resp.ok) {
    return {
      ok: false,
      error: body?.errors?.[0]?.detail || `HTTP ${resp.status}`,
    };
  }
  return { ok: true, appId: body?.data?.id || null };
}

// --- Track-application card (tracked screen) -----------------------

function setTrackApplyLabel() {
  if (!trackApplyBtn) return;
  const lbl = trackApplyBtn.querySelector('.btn-label');
  if (lbl) {
    lbl.textContent =
      trackedJobPost && trackedJobPost.applyUrl
        ? 'Apply & track'
        : 'Track application';
  }
}

function setTrackApplySending(sending) {
  if (!trackApplyBtn) return;
  trackApplyBtn.disabled = sending;
  if (sending) trackApplyBtn.dataset.state = 'sending';
  else delete trackApplyBtn.dataset.state;
}

function resetTrackApplyCard() {
  if (trackApplyBtn) {
    trackApplyBtn.classList.remove('hidden');
    trackApplyBtn.disabled = false;
    delete trackApplyBtn.dataset.state;
  }
  if (trackApplyLinkEl) trackApplyLinkEl.classList.add('hidden');
  if (trackApplyStatus) setStatus(trackApplyStatus, '');
}

function showTrackApplyOpenLink(appId, label) {
  if (trackApplyBtn) trackApplyBtn.classList.add('hidden');
  if (trackApplyLinkEl && appId) {
    trackApplyLinkEl.href = `${FRONTEND_ORIGIN}/job-applications/${appId}`;
    trackApplyLinkEl.classList.remove('hidden');
  }
  if (trackApplyStatus) setStatus(trackApplyStatus, label || '', 'success');
}

// Dedupe-on-render: when the tracked screen shows, default to the Track
// button, then in the background check whether an application already
// exists for this post and swap to the Open-application link if so.
async function refreshApplicationState() {
  if (!trackApplyBtn) return;
  resetTrackApplyCard();
  setTrackApplyLabel();
  if (!trackedJobPostId) return;
  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) return;
  const jpId = trackedJobPostId;
  const existing = await findExistingApplication(jpId, saved.ccApiKey);
  // Bail if the user moved off this post / screen while we were waiting.
  if (trackedJobPostId !== jpId || currentSendScreenEl !== screenTracked) {
    return;
  }
  if (existing && existing.appId) {
    showTrackApplyOpenLink(existing.appId, 'Already tracked');
  }
}

async function trackApplication() {
  if (!trackedJobPostId) return;
  const jpId = trackedJobPostId;
  const post = trackedJobPost || {};
  const applyUrl = post.applyUrl || null;
  setTrackApplySending(true);
  setStatus(trackApplyStatus, 'Checking…');

  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) {
    setStatus(trackApplyStatus, 'Not connected.', 'error');
    setTrackApplySending(false);
    return;
  }

  // Dedupe first — never mint a duplicate.
  const existing = await findExistingApplication(jpId, saved.ccApiKey);
  if (existing && existing.appId) {
    showTrackApplyOpenLink(existing.appId, 'Already tracked');
    return;
  }
  if (existing && existing.error) {
    setStatus(trackApplyStatus, 'Could not reach Career Caddy.', 'error');
    setTrackApplySending(false);
    return;
  }

  // tracking_url = jp.apply_url || active tab url
  let trackingUrl = applyUrl;
  if (!trackingUrl) {
    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      trackingUrl = (tab && tab.url) || null;
    } catch {
      trackingUrl = null;
    }
  }

  setStatus(trackApplyStatus, 'Tracking…');
  const res = await postJobApplication({
    jobPostId: jpId,
    trackingUrl,
    apiKey: saved.ccApiKey,
  });
  if (!res.ok) {
    setStatus(trackApplyStatus, res.error, 'error');
    setTrackApplySending(false);
    return;
  }
  showTrackApplyOpenLink(res.appId, 'Tracked ✓');

  // "Apply & track": stash the source post for attribution, then open the
  // apply page. If the user reopens the popup on that apply page (no direct
  // JobPost match), the stash lets us resurface this application.
  if (applyUrl) {
    await stashPendingApply({
      jobPostId: String(jpId),
      companyId: post.companyId || null,
      applyUrl,
      jpLink: post.link || null,
      jpTitle: post.title || null,
      company: post.company || null,
      ts: Date.now(),
    });
    try {
      api.tabs.create({ url: applyUrl });
    } catch {
      // best-effort; the application is already tracked
    }
  }
}

if (trackApplyBtn) trackApplyBtn.addEventListener('click', trackApplication);

// --- Apply-attribution stash (chrome.storage.local) ----------------

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Number of leading path segments shared by two same-origin URLs — the
// tiebreak when several stashed applies share an origin.
function pathPrefixScore(stashUrl, tabUrl) {
  try {
    const a = new URL(stashUrl).pathname.split('/').filter(Boolean);
    const b = new URL(tabUrl).pathname.split('/').filter(Boolean);
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    return n;
  } catch {
    return 0;
  }
}

// Read the stash, pruning expired/malformed entries.
async function loadApplyStash() {
  let raw;
  try {
    const got = await api.storage.local.get([CC_PENDING_APPLIES_KEY]);
    raw = got[CC_PENDING_APPLIES_KEY];
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  return raw.filter(
    (r) => r && r.applyUrl && r.jobPostId && now - r.ts <= APPLY_STASH_TTL_MS,
  );
}

async function saveApplyStash(list) {
  try {
    await api.storage.local.set({ [CC_PENDING_APPLIES_KEY]: list });
  } catch {
    // best-effort cache
  }
}

// One entry per apply-url origin, newest first, capped at APPLY_STASH_MAX.
async function stashPendingApply(rec) {
  const list = await loadApplyStash();
  const origin = originOf(rec.applyUrl);
  const deduped = list.filter((r) => originOf(r.applyUrl) !== origin);
  deduped.unshift(rec);
  await saveApplyStash(deduped.slice(0, APPLY_STASH_MAX));
}

async function clearApplyStashForJobPost(jobPostId) {
  const list = await loadApplyStash();
  const next = list.filter((r) => String(r.jobPostId) !== String(jobPostId));
  if (next.length !== list.length) await saveApplyStash(next);
}

// Best same-origin, fresh stash entry for the active apply page (longest
// path-prefix, then most recent). ATS apply URLs redirect/append steps, so
// origin — not exact URL — is the match key.
async function findFreshApplyStash(tabUrl) {
  const origin = originOf(tabUrl);
  if (!origin) return null;
  const list = await loadApplyStash();
  const candidates = list.filter((r) => originOf(r.applyUrl) === origin);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const sa = pathPrefixScore(a.applyUrl, tabUrl);
    const sb = pathPrefixScore(b.applyUrl, tabUrl);
    if (sb !== sa) return sb - sa;
    return b.ts - a.ts;
  });
  return candidates[0];
}

// --- Apply-attribution card (connected/Send screen) ----------------

function resetApplyAttributionCard() {
  pendingApplyOffer = null;
  if (applyAttrCard) applyAttrCard.classList.add('hidden');
  if (applyAttrBtn) {
    applyAttrBtn.classList.remove('hidden');
    applyAttrBtn.disabled = false;
    delete applyAttrBtn.dataset.state;
  }
  if (applyAttrLinkEl) applyAttrLinkEl.classList.add('hidden');
  if (applyAttrStatus) setStatus(applyAttrStatus, '');
}

function showApplyAttrOpenLink(appId, label) {
  if (applyAttrBtn) applyAttrBtn.classList.add('hidden');
  if (applyAttrLinkEl && appId) {
    applyAttrLinkEl.href = `${FRONTEND_ORIGIN}/job-applications/${appId}`;
    applyAttrLinkEl.classList.remove('hidden');
  }
  if (applyAttrStatus) setStatus(applyAttrStatus, label || '', 'success');
}

// Bonus path: the active tab has no direct JobPost match but its origin
// matches a stashed "Apply & track". Offer to track an application
// attributed to the original post (dedupe-on-render → Open application).
async function maybeOfferApplyAttribution(tabUrl, name) {
  if (!applyAttrCard) return;
  const match = await findFreshApplyStash(tabUrl);
  if (!match) return;
  // A late stash check must not yank the user off the Tools tab or a screen
  // that changed meanwhile.
  if (activeTab !== 'send' || currentSendScreenEl !== screenConnected) return;
  void name;
  pendingApplyOffer = match;
  if (applyAttrTitleEl) {
    applyAttrTitleEl.textContent = match.jpTitle || '(untitled job post)';
  }
  if (applyAttrCompanyEl) applyAttrCompanyEl.textContent = match.company || '';
  applyAttrCard.classList.remove('hidden');

  // Dedupe-on-render: if an application already exists for the stashed post,
  // skip straight to Open application and drop the stash entry.
  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) return;
  const existing = await findExistingApplication(match.jobPostId, saved.ccApiKey);
  if (pendingApplyOffer !== match) return; // card was reset/replaced
  if (existing && existing.appId) {
    showApplyAttrOpenLink(existing.appId, 'Already tracked');
    await clearApplyStashForJobPost(match.jobPostId);
  }
}

async function confirmApplyAttribution() {
  const offer = pendingApplyOffer;
  if (!offer) return;
  if (applyAttrBtn) {
    applyAttrBtn.disabled = true;
    applyAttrBtn.dataset.state = 'sending';
  }
  if (applyAttrStatus) setStatus(applyAttrStatus, 'Checking…');

  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) {
    if (applyAttrStatus) setStatus(applyAttrStatus, 'Not connected.', 'error');
    if (applyAttrBtn) {
      applyAttrBtn.disabled = false;
      delete applyAttrBtn.dataset.state;
    }
    return;
  }

  // Dedupe first.
  const existing = await findExistingApplication(offer.jobPostId, saved.ccApiKey);
  if (existing && existing.appId) {
    showApplyAttrOpenLink(existing.appId, 'Already tracked');
    await clearApplyStashForJobPost(offer.jobPostId);
    return;
  }
  if (existing && existing.error) {
    if (applyAttrStatus) {
      setStatus(applyAttrStatus, 'Could not reach Career Caddy.', 'error');
    }
    if (applyAttrBtn) {
      applyAttrBtn.disabled = false;
      delete applyAttrBtn.dataset.state;
    }
    return;
  }

  // tracking_url = the actual apply-page tab URL the user is on.
  let trackingUrl = offer.applyUrl;
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) trackingUrl = tab.url;
  } catch {
    // keep the stashed applyUrl
  }

  if (applyAttrStatus) setStatus(applyAttrStatus, 'Tracking…');
  const res = await postJobApplication({
    jobPostId: offer.jobPostId,
    trackingUrl,
    apiKey: saved.ccApiKey,
  });
  if (!res.ok) {
    if (applyAttrStatus) setStatus(applyAttrStatus, res.error, 'error');
    if (applyAttrBtn) {
      applyAttrBtn.disabled = false;
      delete applyAttrBtn.dataset.state;
    }
    return;
  }
  showApplyAttrOpenLink(res.appId, 'Tracked ✓');
  await clearApplyStashForJobPost(offer.jobPostId);
}

if (applyAttrBtn) {
  applyAttrBtn.addEventListener('click', confirmApplyAttribution);
}

loadTheme();
loadSaved();
