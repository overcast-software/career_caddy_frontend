const ORIGIN = 'https://careercaddy.online';
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

// CCEXT — reopen memory. The popup used to re-run the library lookup on
// EVERY open and optimistically show "Send this page" until it resolved —
// wrong and jarring on a page you just sent/tracked (the highlight→answer
// workflow reopens the popup many times on the same URL).
//   ccTrackedPages: url -> last successful library lookup, so reopen renders
//     Tracked INSTANTLY from the stash, then re-verifies quietly.
//   ccSentPages: url -> just-sent marker bridging the ASYNC extraction gap
//     (CC-122: from-text parses async; the JP may not exist for a while), so
//     reopen shows "Sent — processing…" instead of re-offering Send.
const CC_TRACKED_PAGES_KEY = 'ccTrackedPages';
const TRACKED_STASH_MAX = 50;
const TRACKED_STASH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d
// Freshness window: a stash entry (JP lookup / JA check) younger than this is
// trusted outright — no quiet background re-verify. The highlight→answer loop
// reopens the popup many times in a few minutes; without this, every reopen
// re-fired the lookup + application-check roundtrips.
const STASH_FRESH_MS = 10 * 60 * 1000; // 10m
// /me is near-static (staff flag ~never changes, profile fields rarely) —
// serve it from storage and refresh at most daily.
const ME_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CC_SENT_PAGES_KEY = 'ccSentPages';
const SENT_STASH_MAX = 10;
const SENT_STASH_TTL_MS = 15 * 60 * 1000; // 15m

// CC-138 — signal ladder. On a lookup miss the popup walks a ladder of
// weaker-but-cheaper signals to find the JobPost the user is likely
// applying to (opener tab → open tabs → referrer → id token → page title
// → viewed-JP trail), and offers to track the application on the
// Applications tab. Two supporting stashes / flags:
//   ccViewedPosts: a short rolling trail of JobPosts the user just viewed
//     as Tracked (T6 fallback). Cap 5, TTL 30m.
//   ccTabsOptinDismissed: the user declined the optional "tabs" permission —
//     don't re-prompt on every open.
const CC_VIEWED_POSTS_KEY = 'ccViewedPosts';
const VIEWED_POSTS_MAX = 5;
const VIEWED_POSTS_TTL_MS = 30 * 60 * 1000; // 30m
const CC_TABS_OPTIN_DISMISSED_KEY = 'ccTabsOptinDismissed';
// Cap the ladder's server round-trips per popup-open (roundtrip diet).
const LADDER_MAX_LOOKUPS = 8;
// An opaque token from a URL query/fragment that could be a JobPost id (T4).
const ID_TOKEN_RE = /^[A-Za-z0-9_-]{16,}$/;

// CC-135 (1.8.12) — agentic JP lookup, folded into JobApplication. When the
// free ladder (T1-T6) misses AND the user is staff, the Applications tab
// offers to TRACK the application (the user did apply) and ask Career Caddy to
// find its job post. The trigger is a normal JA create carrying a
// match_context {referrer, page_title, text_excerpt}; the api gates it to
// staff, creates the JA up front (status pending), and an async matcher
// backfills the JA's job_post FK. We poll the JA and render the outcome.
// Stash is keyed by the tab URL -> { jaId } so a result that lands after the
// popup closes surfaces on the next open for that URL.
const CC_MATCH_APPS_KEY = 'ccMatchApps';
const MATCH_APP_STASH_MAX = 10;
const MATCH_APP_STASH_TTL_MS = 30 * 60 * 1000; // 30m
// Popup-side poll: short setInterval while the popup lives, then hand to the
// background alarm (popup lifetime is short). Cap ~24 polls * 2.5s ≈ 60s.
const MATCH_APP_POLL_INTERVAL_MS = 2500;
const MATCH_APP_POLL_MAX = 24;
// Client-side excerpt cap. The api re-truncates to 8000 at write; we cap here
// too so the POST body stays small.
const MATCH_APP_EXCERPT_MAX = 8000;
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

// Result-link anchors ship with a placeholder href="#" until JS assigns the
// real URL. Clicking a placeholder with target="_blank" resolves "#" against
// the popup's own document — duplicating popup.html into a new tab. Swallow
// any click on an anchor whose href hasn't been assigned yet.
document.addEventListener('click', (event) => {
  const anchor = event.target && event.target.closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href || href === '#') event.preventDefault();
});

const screenConnect = $('screen-connect');
const screenConnected = $('screen-connected');
const screenTracked = $('screen-tracked');
const screenLoading = $('screen-loading');
const screenOnCc = $('screen-on-cc'); // CC #2: on-careercaddy dialogue
const onCcOpenEl = $('on-cc-open');
const profileCardEl = $('profile-card'); // CC #1: quick-copy profile fields
const profileFieldsEl = $('profile-fields');
const answerCardEl = $('answer-card'); // CC #47: answer-the-selection tool
const answerBtn = $('answer-btn');
const answerStatus = $('answer-status');
const answerPromptEl = $('answer-prompt'); // CCEXT-10: echo the highlighted text
const answerPromptTextEl = $('answer-prompt-text');
const answerTextEl = $('answer-text');
const answerCopyBtn = $('answer-copy');
const versionEl = $('version');

const openSigninBtn = $('open-signin');
const connectStatus = $('connect-status');

const sendBtn = $('send');
const sendStatus = $('send-status');
const resultLinkEl = $('result-link');
const dismissBtn = $('dismiss');
const recheckBtn = $('recheck'); // CCEXT: sent-processing manual re-check

// "Link this page to a job post" (collapsed card on the Posts/send screen).
// Zero heuristics — no auto-suggestion; the user expands, searches (empty
// query = recent posts), and picks. Lazy: no roundtrip until expanded.
const linkJobCardEl = $('link-job-card');
const linkJobSearchEl = $('link-job-search');
const linkJobListEl = $('link-job-list');
const linkJobStatusEl = $('link-job-status');
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

// --- CC-138: signal-ladder offer (Applications screen) -------------
const ladderOfferCard = $('ladder-offer-card');
const ladderOfferLeadEl = $('ladder-offer-lead');
const ladderOfferTitleEl = $('ladder-offer-title');
const ladderOfferCompanyEl = $('ladder-offer-company');
const ladderOfferBtn = $('ladder-offer-btn');
const ladderOfferDismissBtn = $('ladder-offer-dismiss');
const ladderOfferStatus = $('ladder-offer-status');
const ladderOfferLinkEl = $('ladder-offer-link');
const tabsOptinEl = $('tabs-optin');
const tabsOptinBtn = $('tabs-optin-btn');

// --- CC-135 (1.8.12): agentic-lookup button + result card (staff only) ---
const askAgentEl = $('ask-agent');
const askAgentBtn = $('ask-agent-btn');
const askAgentStatus = $('ask-agent-status');
const matchResultCard = $('match-result');
const matchResultLeadEl = $('match-result-lead');
const matchResultTitleEl = $('match-result-title');
const matchResultCompanyEl = $('match-result-company');
const matchResultStatus = $('match-result-status');
const matchResultLinkEl = $('match-result-link');
// True while a match-application POST/poll is in flight, so a second click
// can't fire a second POST and the visibility gate stays quiet.
let matchAppInFlight = false;
// The setInterval handle for the popup-side poll loop; cleared on terminal
// status (a closed popup hands off to the background alarm).
let matchAppPollTimer = null;

// The ladder result currently surfaced on the offer card: the verified
// JobPost, the tab URL to track against, and whether the copy is tentative
// (T6 viewed-trail only). Null when no offer is showing.
let pendingLadderOffer = null;
// URLs dismissed via "Not this one" this popup session — don't re-offer.
const dismissedLadderUrls = new Set();

// --- Staff Tools tab (is_staff only) -------------------------------
const tabBar = $('tab-bar');
const tabSendBtn = $('tab-send');
const tabApplicationsBtn = $('tab-applications');
const tabToolsBtn = $('tab-tools');
const screenTools = $('screen-tools');
const staffToolsSection = $('staff-tools-section');
// CC-132: Applications tab (the JA interface).
const screenApplications = $('screen-applications');
const applicationsEmptyEl = $('applications-empty');
const applicationsBodyEl = $('applications-body');
const appJpTitleEl = $('app-jp-title');
const appJpCompanyEl = $('app-jp-company');
const toolHostEl = $('tool-host');
const enrichBtn = $('enrich-btn');
const enrichStatus = $('enrich-status');
const enrichLinkEl = $('enrich-link');
const enrichTraceEl = $('enrich-trace');
const selReadoutEl = $('sel-readout');
const selMetaEl = $('sel-meta');
const selJpEl = $('sel-jp');
const selRereadBtn = $('sel-reread');
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

// CC #1: fetch the authenticated user's /me attributes once on popup open.
// Returns the full JSON:API attributes object (or null) so the same response
// drives BOTH the staff-tab gate (is_staff) and the quick-copy profile card.
async function fetchMe(apiKey) {
  try {
    const resp = await fetch(`${ORIGIN}/api/v1/me/`, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!resp.ok) return null;
    const body = await resp.json();
    return body?.data?.attributes || null;
  } catch {
    return null;
  }
}

async function refreshStaffFlag(apiKey) {
  // Serve /me from the storage cache when fresh — one fewer roundtrip on
  // every popup open. A failed fetch is never cached, so the next open
  // retries.
  let cachedMe = null;
  try {
    const got = await api.storage.local.get(['ccMe']);
    cachedMe = got.ccMe || null;
  } catch {
    cachedMe = null;
  }
  if (
    cachedMe &&
    cachedMe.attrs &&
    cachedMe.ts &&
    Date.now() - cachedMe.ts < ME_CACHE_TTL_MS
  ) {
    isStaff = cachedMe.attrs.is_staff === true;
    maybeShowTabBar();
    renderProfileCard(cachedMe.attrs);
    return isStaff;
  }
  const attrs = await fetchMe(apiKey);
  const staff = attrs?.is_staff === true;
  isStaff = staff;
  try {
    await api.storage.local.set({
      ccIsStaff: staff,
      ...(attrs ? { ccMe: { attrs, ts: Date.now() } } : {}),
    });
  } catch {
    // best-effort cache; the live flag is authoritative this session
  }
  maybeShowTabBar();
  renderProfileCard(attrs); // CC #1: hydrate the quick-copy card from /me
  return staff;
}

// CC #1 / CCEXT-1: the quick-copy card renders a single LinkedIn row sourced
// from the /me `linkedin` attribute. The whole card stays hidden when the user
// has no LinkedIn on file. The value is written with textContent (never
// innerHTML) so a stray '<' can't inject markup.
function renderProfileCard(attrs) {
  if (!profileCardEl || !profileFieldsEl) return;
  profileFieldsEl.replaceChildren();
  const linkedin = attrs && attrs.linkedin ? String(attrs.linkedin).trim() : '';
  if (!linkedin) {
    profileCardEl.classList.add('hidden');
    return;
  }
  profileFieldsEl.appendChild(
    buildProfileRow('LinkedIn', linkedin, 'Copy LinkedIn'),
  );
  profileCardEl.classList.remove('hidden');
}

function buildProfileRow(label, value, copyLabel = 'Copy') {
  const row = document.createElement('div');
  row.className = 'profile-row';
  const labelEl = document.createElement('span');
  labelEl.className = 'profile-label';
  labelEl.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.className = 'profile-value';
  valueEl.textContent = value;
  valueEl.title = value;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'profile-copy';
  btn.textContent = copyLabel;
  btn.addEventListener('click', () => copyProfileValue(btn, value, copyLabel));
  row.append(labelEl, valueEl, btn);
  return row;
}

// CC #1: copy a profile value to the clipboard with a brief affordance. The
// write happens from a user gesture in the popup, so no clipboard permission
// is needed. Uses .then/.catch (not async/await) per the extension idiom.
function copyProfileValue(btn, value, copyLabel = 'Copy') {
  navigator.clipboard
    .writeText(value)
    .then(() => {
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = copyLabel;
        btn.classList.remove('copied');
      }, 1200);
    })
    .catch(() => {
      btn.textContent = 'Failed';
      setTimeout(() => {
        btn.textContent = copyLabel;
      }, 1200);
    });
}

function hideTabBar() {
  if (tabBar) tabBar.classList.add('hidden');
}

// The tab bar appears for EVERY connected user on a connected/tracked
// screen — never on connect/loading. (Was staff-only; the Tools tab now
// carries user tools — staff-only cards are gated INSIDE the tab by
// showToolsScreen.)
function maybeShowTabBar() {
  if (!tabBar) return;
  // The Staff tab button exists only for staff accounts.
  if (tabToolsBtn) tabToolsBtn.classList.toggle('hidden', !isStaff);
  const onSendableScreen =
    currentSendScreenEl === screenConnected ||
    currentSendScreenEl === screenTracked;
  if (onSendableScreen) {
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
  if (tabApplicationsBtn) tabApplicationsBtn.classList.remove('active');
  if (tabToolsBtn) tabToolsBtn.classList.remove('active');
  maybeShowTabBar();
}

function setActiveTab(tab) {
  activeTab = tab;
  // Hide EVERY screen region first (incl. the loading skeleton — it bleeds
  // through otherwise, since currentSendScreenEl is null until the
  // popup-open lookup resolves), then reveal the active tab's own.
  screenLoading.classList.add('hidden');
  screenConnect.classList.add('hidden');
  screenConnected.classList.add('hidden');
  screenTracked.classList.add('hidden');
  if (screenTools) screenTools.classList.add('hidden');
  if (screenApplications) screenApplications.classList.add('hidden');
  if (tab === 'tools') {
    if (screenTools) screenTools.classList.remove('hidden');
    showToolsScreen();
  } else if (tab === 'applications') {
    if (screenApplications) screenApplications.classList.remove('hidden');
    showApplicationsScreen();
  } else {
    // Posts: show whatever the lookup resolved to, or the skeleton if it's
    // still in flight.
    if (currentSendScreenEl) {
      currentSendScreenEl.classList.remove('hidden');
    } else {
      screenLoading.classList.remove('hidden');
    }
  }
  if (tabSendBtn) tabSendBtn.classList.toggle('active', tab === 'send');
  if (tabApplicationsBtn)
    tabApplicationsBtn.classList.toggle('active', tab === 'applications');
  if (tabToolsBtn) tabToolsBtn.classList.toggle('active', tab === 'tools');
}

if (tabSendBtn)
  tabSendBtn.addEventListener('click', () => setActiveTab('send'));
if (tabApplicationsBtn)
  tabApplicationsBtn.addEventListener('click', () => setActiveTab('applications'));
if (tabToolsBtn)
  tabToolsBtn.addEventListener('click', () => setActiveTab('tools'));

// CC-132: populate the Applications tab. Everything renders off state the
// popup already holds (trackedJobPost + the JA cache on its stash entry) —
// the only network call is refreshApplicationState's dedupe check, and only
// when that cache is cold.
function showApplicationsScreen() {
  const hasJp = !!(trackedJobPost && trackedJobPostId);
  // Any offer (apply-attribution stash or CC-138 ladder) suppresses the
  // empty-state helper — the offer card carries the message.
  const matchResultActive =
    !!(matchResultCard && !matchResultCard.classList.contains('hidden'));
  const offerActive =
    !!pendingApplyOffer || !!pendingLadderOffer || matchResultActive;
  if (applicationsBodyEl) {
    applicationsBodyEl.classList.toggle('hidden', !hasJp);
  }
  if (applicationsEmptyEl) {
    applicationsEmptyEl.classList.toggle('hidden', hasJp || offerActive);
  }
  // CC-135: the ask-agent affordance + match-result card are miss-state
  // surfaces — hide them once a JobPost is directly matched, otherwise let
  // refreshAskAgentButton govern the button (staff-gated, suppressed by an
  // active offer, kept up while a request is in flight).
  if (hasJp) {
    if (askAgentEl) askAgentEl.classList.add('hidden');
    resetMatchResultCard();
  } else {
    refreshAskAgentButton();
  }
  if (!hasJp) return;
  if (appJpTitleEl) {
    appJpTitleEl.textContent = trackedJobPost.title || '(untitled job post)';
  }
  if (appJpCompanyEl) {
    appJpCompanyEl.textContent = trackedJobPost.company || '';
  }
  refreshApplicationState();
  // Echo the current page selection so a highlighted question is ready to
  // answer without expanding + clicking.
  primeAnswerSelection();
}

// Populate the Staff tab when it opens (selection readout, Sharpen,
// proposed-post validator, dedup hints). The tab button renders only for
// staff; the section toggle is defense in depth. The api enforces staff
// server-side on every tool call — this gate only governs visibility.
async function showToolsScreen() {
  if (whoToolsEl) whoToolsEl.textContent = connectedName || '';
  if (staffToolsSection) {
    staffToolsSection.classList.toggle('hidden', !isStaff);
  }
  if (!isStaff) return;
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
  resetEnrichTrace();
  if (enrichBtn) {
    delete enrichBtn.dataset.state;
    enrichBtn.disabled = !host;
  }
  populateDevHints();
  populateSelectionReadout();
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

// --- Sharpen step-trace (staff introspection) ----------------------
// The Sharpen button used to leave you guessing. These append a visible,
// numbered log of each step (resolve host -> match profile -> POST -> queued)
// so a staff user can SEE exactly what happened and where it stopped.
function resetEnrichTrace() {
  if (!enrichTraceEl) return;
  enrichTraceEl.textContent = '';
  enrichTraceEl.classList.add('hidden');
}

function pushEnrichTrace(msg, kind) {
  if (!enrichTraceEl) return;
  const li = document.createElement('li');
  li.textContent = msg;
  if (kind) li.classList.add(kind);
  enrichTraceEl.appendChild(li);
  enrichTraceEl.classList.remove('hidden');
}

// --- Selection readout (staff introspection) -----------------------
// Echo the EXACT text the extension reads from the active page's highlight,
// how many frames it came from, and whether this page maps to a job post an
// AI answer could use as context. This is the "prove it can see my
// selection" surface.
async function readSelectionDetails() {
  let tab;
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    return { text: '', frames: 0, hitFrames: 0 };
  }
  if (!tab || tab.id == null) return { text: '', frames: 0, hitFrames: 0 };
  try {
    const results = await api.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => (window.getSelection ? window.getSelection().toString() : ''),
    });
    const arr = Array.isArray(results) ? results : [];
    let text = '';
    let hitFrames = 0;
    for (const r of arr) {
      const s = r && r.result ? String(r.result).trim() : '';
      if (s) {
        hitFrames++;
        if (!text) text = s; // first non-empty frame wins (matches the answer path)
      }
    }
    return { text, frames: arr.length, hitFrames };
  } catch {
    return { text: '', frames: 0, hitFrames: 0 };
  }
}

async function populateSelectionReadout() {
  if (!selReadoutEl) return;
  selReadoutEl.textContent = 'Reading the page selection…';
  selReadoutEl.classList.remove('empty');
  if (selMetaEl) selMetaEl.classList.add('hidden');
  const { text, frames, hitFrames } = await readSelectionDetails();
  if (!text) {
    selReadoutEl.textContent =
      '(nothing highlighted — select text on the page, then Re-read)';
    selReadoutEl.classList.add('empty');
    if (selMetaEl) selMetaEl.classList.add('hidden');
  } else {
    selReadoutEl.textContent = text;
    selReadoutEl.classList.remove('empty');
    if (selMetaEl) {
      selMetaEl.textContent = `${text.length.toLocaleString()} chars · read from ${hitFrames} of ${frames} frame(s)`;
      selMetaEl.classList.remove('hidden');
    }
  }
  populateSelectionJpStatus();
}

// Independent library lookup for the active URL (the Tools tab discards the
// Send-path lookup, so we run our own) — reports whether an AI answer here
// would have a job post as context. Server-provided strings only, set via
// textContent, so page/JP data can never inject markup.
async function populateSelectionJpStatus() {
  if (!selJpEl) return;
  selJpEl.textContent = 'Checking your library…';
  let saved;
  let tab;
  try {
    saved = await api.storage.local.get(['ccApiKey']);
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    selJpEl.textContent = '';
    return;
  }
  if (!saved.ccApiKey || !tab || !tab.url) {
    selJpEl.textContent = '';
    return;
  }
  let found = null;
  try {
    found = await lookupExistingJobPost(tab.url, saved.ccApiKey);
  } catch {
    found = null;
  }
  selJpEl.textContent = '';
  if (found && found.id) {
    selJpEl.appendChild(
      document.createTextNode(
        `In your library: “${found.title || 'untitled post'}” (#${found.id}). An AI answer here references this post — `,
      ),
    );
    const link = document.createElement('a');
    link.href = `${FRONTEND_ORIGIN}/job-posts/${found.id}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'view it';
    selJpEl.appendChild(link);
    selJpEl.appendChild(document.createTextNode('.'));
  } else {
    selJpEl.textContent =
      'Not in your library yet — Send this page first so an AI answer can use this job as context.';
  }
}

if (selRereadBtn)
  selRereadBtn.addEventListener('click', populateSelectionReadout);

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
  resetEnrichTrace();
  setEnrichSending(true);
  setStatus(enrichStatus, 'Resolving profile…');

  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) {
    pushEnrichTrace('Not connected — no API key stored.', 'bad');
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
    pushEnrichTrace('No active tab to read a host from.', 'bad');
    setStatus(enrichStatus, 'No active tab to sharpen.', 'error');
    setEnrichSending(false);
    return;
  }
  pushEnrichTrace(`1. Resolving a ScrapeProfile for ${normalizeHostname(host)}…`);

  const resolved = await resolveProfileId(host, saved.ccApiKey);
  if (resolved && resolved.forbidden) {
    pushEnrichTrace('The API refused the lookup — staff access required.', 'bad');
    setStatus(enrichStatus, 'Staff access required.', 'error');
    setEnrichSending(false);
    return;
  }
  if (!resolved) {
    pushEnrichTrace(
      `No ScrapeProfile matches ${normalizeHostname(host)}. Nothing to sharpen — Send this page first to create one.`,
      'bad',
    );
    setStatus(
      enrichStatus,
      `No ScrapeProfile for ${normalizeHostname(host)} yet — capture a scrape for this domain first.`,
      'error',
    );
    setEnrichSending(false);
    return;
  }
  pushEnrichTrace(
    `2. Matched profile #${resolved.id} (${resolved.hostname}).`,
    'ok',
  );

  pushEnrichTrace(`3. POST /scrape-profiles/${resolved.id}/sharpen/ …`);
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
    pushEnrichTrace(`Network error: ${err.message}`, 'bad');
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
    pushEnrichTrace(
      `Rejected (HTTP ${resp.status}) — staff access required.`,
      'bad',
    );
    setStatus(enrichStatus, 'Staff access required.', 'error');
    setEnrichSending(false);
    return;
  }
  if (resp.status === 422) {
    pushEnrichTrace(
      `HTTP 422 — no completed scrape for ${resolved.hostname} yet. Send this page, then Sharpen.`,
      'bad',
    );
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
    pushEnrichTrace(`Failed: ${detail}`, 'bad');
    setStatus(enrichStatus, `Error: ${detail}`, 'error');
    setEnrichSending(false);
    return;
  }

  const jobId = body?.meta?.job_id;
  pushEnrichTrace(
    `4. Queued${jobId ? ` — sharpen job #${jobId}` : ''}. The offline enhancer runs it; re-open the profile shortly to see the changes.`,
    'ok',
  );
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
  if (screenApplications) screenApplications.classList.add('hidden');
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

// Introspection: turn the last selector-lookup outcome into an HONEST note —
// a genuine 404 ("no profile") vs a masked failure (429 throttle / 5xx /
// network) that only LOOKS like "no profile". Answers "no scrape profile,
// really?" truthfully instead of collapsing every miss to one line.
function profileLookupNote(host) {
  const label = host || 'this host';
  const f = lastSelectorFetch;
  if (!f) return `No ScrapeProfile for ${label}.`;
  if (f.status === 404) {
    return `No ScrapeProfile for ${label} — the API returned 404 (confirmed absent${f.from === 'cache' ? ', cached' : ''}).`;
  }
  if (f.ok) {
    return `A ScrapeProfile exists for ${label}, but it has no extension selectors configured.`;
  }
  if (f.status === 429) {
    return `Profile lookup was THROTTLED (HTTP 429) — this is NOT a confirmed absence. Re-check after the rate limit clears.`;
  }
  if (f.status === 0) {
    return `Profile lookup couldn't reach the API${f.error ? ` (${f.error})` : ''} — NOT a confirmed absence. Re-check.`;
  }
  return `Profile lookup failed (HTTP ${f.status}) — NOT a confirmed absence. Re-check.`;
}

function renderProposedPost(hints, host) {
  // No selectors resolved: could be a genuine 404, or a masked 429/5xx/network
  // failure. profileLookupNote() reads the lookup's real outcome and says which.
  if (!hints || !hints.has_selectors) {
    resetProposedPost(profileLookupNote(host));
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
  // The JP already carries an apply link — nothing to backfill. Skips the
  // hints fetch + PATCH that used to fire on every tracked-screen render.
  if (trackedJobPost && trackedJobPost.applyUrl) return;
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
    const resp = await fetch(`${ORIGIN}/api/v1/job-posts/${trackedJobPostId}`, {
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
    if (resp.ok && trackedJobPost) {
      // Memo the backfilled value in-session and on the stash entry so
      // neither this open nor stashed reopens repeat the PATCH.
      trackedJobPost.applyUrl = hints.apply_url;
      stashTrackedPage(tab.url, trackedJobPost);
    }
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
  // Reset any sent-processing residue (same popup lifetime).
  sendBtn.classList.remove('hidden');
  if (autoScoreRow) autoScoreRow.classList.remove('hidden');
  if (recheckBtn) recheckBtn.classList.add('hidden');
  resetApplyAttributionCard(); // CC #46: hidden unless a stash match offers it
  resetLadderOfferCard(); // CC-138: hidden unless the signal ladder offers it
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
  // CC-138 T6: remember this viewed post so a later apply-page miss can offer
  // it from the viewed-JP trail. Fire-and-forget; the stash is best-effort.
  pushViewedPost(found);
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
  // CCEXT reopen-memory: tracked stash first — a page we already know maps
  // to a JobPost renders its final screen INSTANTLY (no wrong "Send this
  // page" flash), then re-verifies quietly in the background.
  const trackedMap = await readPageStash(
    CC_TRACKED_PAGES_KEY,
    TRACKED_STASH_TTL_MS,
  );
  const cached = trackedMap[tab.url];
  if (cached && cached.found && cached.found.id) {
    if (cached.found.complete === false) {
      showConnected(name, cached.found);
    } else {
      showTracked(cached.found, name);
      // v0 tab landing (state-based): a cached application means the user
      // is past "find the post" — open straight onto the Applications tab.
      if (cached.found.appId) setActiveTab('applications');
    }
    // Fresh stash = trusted: skip the quiet background re-verify roundtrip
    // entirely. It only re-runs once the entry ages past the window.
    if (cached.ts && Date.now() - cached.ts < STASH_FRESH_MS) return;
    lookupExistingJobPost(tab.url, apiKey)
      .then((found) => {
        if (!found) {
          // Ambiguous: a miss OR a network/throttle blip — the lookup
          // collapses both to null. Never demote a known-tracked page on
          // ambiguity; a truly deleted JP surfaces on the next action.
          return;
        }
        // Same post → merge over the cached record so the JA discovery
        // (appId / appCheckedTs) survives the refresh; a plain overwrite
        // would wipe it and re-trigger the application check next open.
        stashTrackedPage(
          tab.url,
          String(found.id) === String(cached.found.id)
            ? { ...cached.found, ...found }
            : found,
        );
        if (activeTab !== 'send') return;
        // Correct the screen only when the fresh truth materially differs
        // and we wouldn't yank the user mid-answer.
        if (found.complete === false && !answerPolling) {
          showConnected(name, found);
        } else if (
          found.complete !== false &&
          String(found.id) !== String(cached.found.id)
        ) {
          showTracked(found, name);
        }
      })
      .catch(() => {});
    return;
  }

  // CCEXT reopen-memory: just-sent marker — extraction is async (CC-122),
  // so the JP may not exist yet. Show "Sent — processing…" (never the Send
  // form) and upgrade to Tracked when the lookup starts hitting.
  const sentMap = await readPageStash(CC_SENT_PAGES_KEY, SENT_STASH_TTL_MS);
  if (sentMap[tab.url]) {
    showSentProcessing(name);
    lookupExistingJobPost(tab.url, apiKey)
      .then(async (found) => {
        if (!found) return; // still extracting — Re-check or reopen later
        await removePageStash(CC_SENT_PAGES_KEY, tab.url);
        stashTrackedPage(tab.url, found);
        if (activeTab !== 'send') return;
        if (found.complete) {
          showTracked(found, name);
        } else {
          showConnected(name, found);
        }
      })
      .catch(() => {});
    return;
  }

  // Show the Send UI IMMEDIATELY rather than blocking the popup on the
  // library lookup, which can take several seconds. Run the lookup in the
  // background and upgrade to the Tracked / resend screen when it returns —
  // but only if the user is still on the Send tab, so a late result never
  // yanks them off the Tools tab.
  showConnected(name);
  lookupExistingJobPost(tab.url, apiKey)
    .then((found) => {
      if (found) stashTrackedPage(tab.url, found); // remember for next open
      if (activeTab !== 'send') return;
      if (!found) {
        // No direct JobPost match. CC #46 bonus: the active tab may be an
        // ATS apply page opened via "Apply & track" on the source post —
        // consult the apply-attribution stash and offer to track it.
        maybeOfferApplyAttribution(tab.url, name).then((offered) => {
          // CC-138: the origin-match stash yielded nothing — walk the signal
          // ladder (opener/open-tabs/referrer/id-token/title/viewed-trail).
          if (!offered) maybeOfferFromLadder(tab, apiKey);
        });
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

// CCEXT reopen-memory: this page was sent moments ago and the async
// extraction hasn't produced the JobPost yet. NEVER re-offer "Send this
// page" here — show a processing state with a manual Re-check.
function showSentProcessing(name) {
  showConnected(name);
  const headingEl = document.getElementById('connected-heading');
  if (headingEl) headingEl.textContent = 'Sent to Career Caddy';
  sendBtn.classList.add('hidden');
  if (autoScoreRow) autoScoreRow.classList.add('hidden');
  setStatus(
    sendStatus,
    'Processing — extracting this job post. It will appear as tracked shortly.',
  );
  if (recheckBtn) recheckBtn.classList.remove('hidden');
}

async function handleRecheck() {
  let saved;
  try {
    saved = await api.storage.local.get(['ccApiKey', 'ccUsername']);
  } catch {
    return;
  }
  if (!saved.ccApiKey) return;
  showLoading();
  resolveOpenScreen(saved.ccApiKey, saved.ccUsername);
}

if (recheckBtn) recheckBtn.addEventListener('click', handleRecheck);

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
    maybeResumeAnswer(); // CC #47: resume a pending answer after reopen
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
    'ccMe',
    'ccExtensionSelectorCache',
    CC_TRACKED_PAGES_KEY,
    CC_SENT_PAGES_KEY,
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

// Introspection side-channel: the outcome of the most recent
// loadExtensionSelectors() call, so the Proposed-job-post card can tell a
// genuine 404 ("no profile") apart from a MASKED failure (429 throttle, 5xx,
// network) that merely looks like "no profile". Does not change
// loadExtensionSelectors' return contract.
let lastSelectorFetch = null;

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
    lastSelectorFetch = cached.missing
      ? { host: norm, ok: false, status: 404, from: 'cache' }
      : { host: norm, ok: true, status: 200, from: 'cache' };
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
    lastSelectorFetch = { host: norm, ok: false, status: 0, error: err.message };
    // Network failure — try baked default but don't cache the miss so
    // we retry next time.
    return BAKED_EXTENSION_SELECTORS[norm] || null;
  }
  if (resp.status === 404) {
    // No api-side profile for this host; baked default if we have one,
    // else nothing. Cache the miss so we don't refetch every send.
    lastSelectorFetch = { host: norm, ok: false, status: 404 };
    const baked = BAKED_EXTENSION_SELECTORS[norm] || null;
    await writeSelectorCache(norm, baked ? { selectors: baked } : { missing: true });
    return baked;
  }
  if (!resp.ok) {
    // 429 throttle / 5xx / etc. — NOT a confirmed absence. Record the real
    // status so the Proposed-post card can say so instead of "no profile".
    console.warn('[cc-sender] selector fetch non-200', resp.status);
    lastSelectorFetch = { host: norm, ok: false, status: resp.status };
    return BAKED_EXTENSION_SELECTORS[norm] || null;
  }
  lastSelectorFetch = { host: norm, ok: true, status: resp.status };
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
      // CCEXT reopen-memory: the page maps to an existing JP — remember it.
      await stashTrackedPage(payload.url, {
        id: String(existingJobPostId),
        title: meta.title || null,
        company: meta.company_name || null,
        companyId: null,
        applyUrl: null,
        link: payload.url,
        topScore: null,
        hasPendingScore: false,
        complete: true,
      });
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

  // CC-122: from-text extraction is ASYNC — the job-post relationship may
  // or may not be on the response yet. When it is, surface the link and
  // fire the "added" notification now; when it isn't, the bg poll picks it
  // up. The bg path still polls for the score result when auto-score is on;
  // that's the SECOND, score-aware notification.
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

  // CCEXT reopen-memory: remember this URL so a reopen NEVER re-offers
  // "Send this page". JP already known → tracked stash (instant Tracked
  // screen); still extracting → sent marker ("Sent — processing…" until the
  // lookup or bg poll promotes it).
  if (newJobPostId) {
    await stashTrackedPage(payload.url, {
      id: String(newJobPostId),
      title: newJobTitle,
      company: null,
      companyId: null,
      applyUrl: null,
      link: payload.url,
      topScore: null,
      hasPendingScore: !!wantsScore,
      complete: true,
    });
  } else {
    await writePageStash(
      CC_SENT_PAGES_KEY,
      SENT_STASH_TTL_MS,
      SENT_STASH_MAX,
      payload.url,
      { scrapeId: String(scrapeId) },
    );
  }
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
  // The button creates the JobApplication in-place and confirms inline — it
  // never navigates — so the label is always "Track application" regardless
  // of whether the post carries an apply_url.
  if (lbl) lbl.textContent = 'Track application';
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
    // Canonical nested route (jp/show/ja/show) — skips the flat-route
    // redirect hop.
    trackApplyLinkEl.href = trackedJobPostId
      ? `${FRONTEND_ORIGIN}/job-posts/${trackedJobPostId}/job-applications/${appId}`
      : `${FRONTEND_ORIGIN}/job-applications/${appId}`;
    trackApplyLinkEl.classList.remove('hidden');
  }
  if (trackApplyStatus) setStatus(trackApplyStatus, label || '', 'success');
}

// Dedupe-on-render: when the tracked screen shows, default to the Track
// button, then check whether an application already exists for this post
// and swap to the Open-application link if so. The discovery is cached on
// the tracked-page stash entry (appId, or a timestamped negative check) so
// reopening a page costs zero application roundtrips until the cache ages.
async function refreshApplicationState() {
  if (!trackApplyBtn) return;
  resetTrackApplyCard();
  setTrackApplyLabel();
  if (!trackedJobPostId) return;
  if (trackedJobPost && trackedJobPost.appId) {
    showTrackApplyOpenLink(trackedJobPost.appId, 'Already tracked');
    return;
  }
  if (
    trackedJobPost &&
    trackedJobPost.appCheckedTs &&
    Date.now() - trackedJobPost.appCheckedTs < STASH_FRESH_MS
  ) {
    return; // recently confirmed no application — the Track button stands
  }
  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) return;
  const jpId = trackedJobPostId;
  const existing = await findExistingApplication(jpId, saved.ccApiKey);
  // Bail if the user moved off this post / tab while we were waiting.
  if (trackedJobPostId !== jpId || activeTab !== 'applications') {
    return;
  }
  if (existing && existing.appId) {
    showTrackApplyOpenLink(existing.appId, 'Already tracked');
    rememberApplicationState(existing.appId);
  } else if (existing && !existing.error) {
    rememberApplicationState(null); // confirmed absent — stamp the check
  }
}

// Persist the JA discovery onto the tracked-page stash entry so the next
// popup open renders application state without a roundtrip. appId = found;
// null = confirmed absent (timestamped so the check re-runs once stale).
async function rememberApplicationState(appId) {
  if (!trackedJobPost) return;
  if (appId) {
    trackedJobPost.appId = String(appId);
    delete trackedJobPost.appCheckedTs;
  } else {
    trackedJobPost.appCheckedTs = Date.now();
  }
  let tab;
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    return;
  }
  if (tab && tab.url) await stashTrackedPage(tab.url, trackedJobPost);
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
    rememberApplicationState(existing.appId);
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
  rememberApplicationState(res.appId);

  // Create-in-place: the JobApplication is recorded and confirmed inline. We
  // do NOT open the apply page in a new tab. When the post carries an
  // apply_url we still stash the source post for attribution, so if the user
  // navigates to that apply page themselves the popup can resurface this
  // application (the apply-attribution recovery card).
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
  }
}

if (trackApplyBtn) trackApplyBtn.addEventListener('click', trackApplication);

// --- Reopen-memory stashes (chrome.storage.local) ------------------
// Generic url-keyed map with TTL + size cap; used by ccTrackedPages and
// ccSentPages. Prunes expired/malformed entries on every read.

async function readPageStash(storageKey, ttlMs) {
  let raw;
  try {
    const got = await api.storage.local.get([storageKey]);
    raw = got[storageKey];
  } catch {
    return {};
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const now = Date.now();
  const pruned = {};
  for (const [url, entry] of Object.entries(raw)) {
    if (entry && entry.ts && now - entry.ts <= ttlMs) pruned[url] = entry;
  }
  return pruned;
}

async function writePageStash(storageKey, ttlMs, max, url, entry) {
  if (!url) return;
  const map = await readPageStash(storageKey, ttlMs);
  map[url] = { ...entry, ts: Date.now() };
  const urls = Object.keys(map);
  if (urls.length > max) {
    urls.sort((a, b) => map[a].ts - map[b].ts); // oldest first
    while (urls.length > max) delete map[urls.shift()];
  }
  try {
    await api.storage.local.set({ [storageKey]: map });
  } catch {
    // best-effort cache
  }
}

async function removePageStash(storageKey, url) {
  let raw;
  try {
    const got = await api.storage.local.get([storageKey]);
    raw = got[storageKey];
  } catch {
    return;
  }
  if (!raw || typeof raw !== 'object' || !(url in raw)) return;
  delete raw[url];
  try {
    await api.storage.local.set({ [storageKey]: raw });
  } catch {
    // best-effort cache
  }
}

function stashTrackedPage(url, found) {
  return writePageStash(
    CC_TRACKED_PAGES_KEY,
    TRACKED_STASH_TTL_MS,
    TRACKED_STASH_MAX,
    url,
    { found },
  );
}

// --- "Link this page to a job post" (user Tools tab) -----------------
// A "job" isn't one URL — ATS flows walk /confirm -> /application, and the
// capture site vs apply site can be different domains entirely. ZERO
// heuristics by design (Doug 2026-07-08, after an origin-match suggestion
// misfired on a single-origin portal): no auto-suggestion, no URL matching.
// The user searches their posts (empty query = recent) and picks; picking
// PATCHes this page's URL onto the post's apply_url — a leg of the
// popup-open lookup, so the link resolves cross-device — and stashes it
// locally for instant resolution on reopen.

async function fetchPosts(apiKey, { query = '', limit = 10 } = {}) {
  const params = new URLSearchParams({
    sort: '-created_at',
    'page[size]': String(limit),
    include: 'company',
  });
  if (query) params.set('filter[query]', query);
  let resp;
  try {
    resp = await fetch(
      `${ORIGIN}/api/v1/job-posts/?${params.toString()}`,
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
  if (!resp.ok) return null;
  let body;
  try {
    body = await resp.json();
  } catch {
    return null;
  }
  const rows = Array.isArray(body?.data) ? body.data : [];
  return rows.map((item) => {
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
    return {
      id: item.id,
      title: attrs.title,
      company,
      companyId: companyRel ? String(companyRel.id) : null,
      applyUrl: attrs.apply_url || null,
      link: attrs.link || null,
      topScore: typeof attrs.top_score === 'number' ? attrs.top_score : null,
      hasPendingScore: false,
      complete: attrs.complete === false ? false : true,
    };
  });
}

function linkJobEmptyRow(msg) {
  const div = document.createElement('div');
  div.className = 'link-job-empty';
  div.textContent = msg;
  return div;
}

let linkJobRenderSeq = 0; // drops stale async renders under fast typing
let pendingOverwriteId = null; // two-click confirm for an occupied apply_url

async function renderLinkJobList(query = '') {
  if (!linkJobListEl) return;
  const seq = ++linkJobRenderSeq;
  pendingOverwriteId = null;
  setStatus(linkJobStatusEl, '');
  linkJobListEl.replaceChildren(
    linkJobEmptyRow(query ? 'Searching…' : 'Loading recent posts…'),
  );
  let saved;
  try {
    saved = await api.storage.local.get(['ccApiKey']);
  } catch {
    saved = null;
  }
  if (!saved || !saved.ccApiKey) {
    if (seq !== linkJobRenderSeq) return;
    linkJobListEl.replaceChildren(linkJobEmptyRow('Not connected.'));
    return;
  }
  const posts = await fetchPosts(saved.ccApiKey, { query });
  if (seq !== linkJobRenderSeq) return; // superseded by a newer keystroke
  if (!posts) {
    linkJobListEl.replaceChildren(
      linkJobEmptyRow("Couldn't load your posts — try again."),
    );
    return;
  }
  if (!posts.length) {
    linkJobListEl.replaceChildren(
      linkJobEmptyRow(
        query ? 'No posts match that search.' : 'No tracked jobs yet.',
      ),
    );
    return;
  }
  linkJobListEl.replaceChildren();
  for (const found of posts) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link-job-row';
    const title = document.createElement('span');
    title.className = 'ljr-title';
    title.textContent = found.title || '(untitled job post)';
    btn.appendChild(title);
    if (found.company) {
      const company = document.createElement('span');
      company.className = 'ljr-company';
      company.textContent = found.company;
      btn.appendChild(company);
    }
    btn.addEventListener('click', () => linkCurrentPageTo(found));
    linkJobListEl.appendChild(btn);
  }
}

async function linkCurrentPageTo(found) {
  let tab;
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    tab = null;
  }
  if (!tab || !tab.url) {
    setStatus(linkJobStatusEl, 'No linkable page in the active tab.', 'error');
    return;
  }
  const verdict = classifyUrl(tab.url);
  if (!verdict.ok) {
    setStatus(linkJobStatusEl, verdict.message, 'error');
    return;
  }
  // Replacing a different, already-set apply link takes a second click —
  // the first warns instead of silently clobbering it.
  if (
    found.applyUrl &&
    found.applyUrl !== tab.url &&
    pendingOverwriteId !== found.id
  ) {
    pendingOverwriteId = found.id;
    setStatus(
      linkJobStatusEl,
      'That post already has an apply link — click again to replace it.',
      'error',
    );
    return;
  }
  pendingOverwriteId = null;
  setStatus(linkJobStatusEl, 'Linking…');
  let saved;
  try {
    saved = await api.storage.local.get(['ccApiKey']);
  } catch {
    saved = null;
  }
  let patched = false;
  if (saved && saved.ccApiKey) {
    try {
      const resp = await fetch(`${ORIGIN}/api/v1/job-posts/${found.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${saved.ccApiKey}`,
        },
        body: JSON.stringify({
          data: {
            type: 'job-post',
            id: String(found.id),
            attributes: { apply_url: tab.url },
          },
        }),
      });
      patched = resp.ok;
    } catch {
      patched = false;
    }
  }
  const linked = patched ? { ...found, applyUrl: tab.url } : found;
  await stashTrackedPage(tab.url, linked);
  if (!patched) {
    // Honest status: the server didn't take the apply link, so it lives
    // only in this browser's stash — other devices won't resolve it.
    setStatus(
      linkJobStatusEl,
      "Couldn't save the apply link to the server — linked on this device only.",
      'error',
    );
    return;
  }
  setStatus(linkJobStatusEl, '');
  setActiveTab('send');
  if (linked.complete === false) {
    showConnected(connectedName, linked);
  } else {
    showTracked(linked, connectedName);
  }
}

if (linkJobCardEl) {
  linkJobCardEl.addEventListener('toggle', () => {
    if (linkJobCardEl.open) {
      renderLinkJobList(linkJobSearchEl ? linkJobSearchEl.value.trim() : '');
    }
  });
}

if (linkJobSearchEl) {
  let linkJobSearchTimer = null;
  linkJobSearchEl.addEventListener('input', () => {
    if (linkJobSearchTimer) clearTimeout(linkJobSearchTimer);
    linkJobSearchTimer = setTimeout(() => {
      renderLinkJobList(linkJobSearchEl.value.trim());
    }, 300);
  });
}

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

function showApplyAttrOpenLink(appId, label, jobPostId) {
  if (applyAttrBtn) applyAttrBtn.classList.add('hidden');
  if (applyAttrLinkEl && appId) {
    // Canonical nested route (jp/show/ja/show) — skips the flat-route
    // redirect hop.
    applyAttrLinkEl.href = jobPostId
      ? `${FRONTEND_ORIGIN}/job-posts/${jobPostId}/job-applications/${appId}`
      : `${FRONTEND_ORIGIN}/job-applications/${appId}`;
    applyAttrLinkEl.classList.remove('hidden');
  }
  if (applyAttrStatus) setStatus(applyAttrStatus, label || '', 'success');
}

// Bonus path: the active tab has no direct JobPost match but its origin
// matches a stashed "Apply & track". Offer to track an application
// attributed to the original post (dedupe-on-render → Open application).
// Returns true when it renders an offer (or resolves to an existing app),
// false on any miss — so the caller can fall through to the CC-138 ladder.
async function maybeOfferApplyAttribution(tabUrl, name) {
  if (!applyAttrCard) return false;
  const match = await findFreshApplyStash(tabUrl);
  if (!match) return false;
  // A late stash check must not yank the user off the Tools tab or a screen
  // that changed meanwhile.
  if (activeTab !== 'send' || currentSendScreenEl !== screenConnected) {
    return false;
  }
  void name;
  pendingApplyOffer = match;
  if (applyAttrTitleEl) {
    applyAttrTitleEl.textContent = match.jpTitle || '(untitled job post)';
  }
  if (applyAttrCompanyEl) applyAttrCompanyEl.textContent = match.company || '';
  applyAttrCard.classList.remove('hidden');
  // v0 tab landing (state-based): a pending-apply match means the user is
  // mid-application — land on the Applications tab, where the card lives.
  setActiveTab('applications');

  // The card is already showing — this path resolves either way, so the
  // caller must NOT fall through to the ladder.
  // Dedupe-on-render: if an application already exists for the stashed post,
  // skip straight to Open application and drop the stash entry.
  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) return true;
  const existing = await findExistingApplication(match.jobPostId, saved.ccApiKey);
  if (pendingApplyOffer !== match) return true; // card was reset/replaced
  if (existing && existing.appId) {
    showApplyAttrOpenLink(existing.appId, 'Already tracked', match.jobPostId);
    await clearApplyStashForJobPost(match.jobPostId);
  }
  return true;
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
    showApplyAttrOpenLink(existing.appId, 'Already tracked', offer.jobPostId);
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
  showApplyAttrOpenLink(res.appId, 'Tracked ✓', offer.jobPostId);
  await clearApplyStashForJobPost(offer.jobPostId);
}

if (applyAttrBtn) {
  applyAttrBtn.addEventListener('click', confirmApplyAttribution);
}

// ===================================================================
// CC-138 — signal ladder + Applications-tab offer
// On a lookup miss (no JobPost at the exact tab URL, and no
// apply-attribution stash), walk a ladder of weaker signals to find the
// post the user is likely applying to. The first tier yielding a VERIFIED
// JobPost renders the offer card and stops the ladder. The whole thing is
// wrapped so any failure degrades to the current miss behavior (Send UI).
// ===================================================================

// --- Viewed-JP trail stash (T6) ------------------------------------
// Push a JobPost the user just saw as Tracked. Newest first, capped, TTL'd.
async function loadViewedPosts() {
  let raw;
  try {
    const got = await api.storage.local.get([CC_VIEWED_POSTS_KEY]);
    raw = got[CC_VIEWED_POSTS_KEY];
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  return raw.filter(
    (r) => r && r.id && r.ts && now - r.ts <= VIEWED_POSTS_TTL_MS,
  );
}

async function pushViewedPost(found) {
  if (!found || !found.id) return;
  const list = await loadViewedPosts();
  const rec = {
    id: String(found.id),
    title: found.title || null,
    company: found.company || null,
    companyId: found.companyId || null,
    link: found.link || null,
    applyUrl: found.applyUrl || null,
    ts: Date.now(),
  };
  const deduped = list.filter((r) => String(r.id) !== rec.id);
  deduped.unshift(rec);
  try {
    await api.storage.local.set({
      [CC_VIEWED_POSTS_KEY]: deduped.slice(0, VIEWED_POSTS_MAX),
    });
  } catch {
    // best-effort cache
  }
}

// --- Optional "tabs" permission ------------------------------------
function hasTabsPermission() {
  try {
    return new Promise((resolve) => {
      if (!api.permissions || !api.permissions.contains) {
        resolve(false);
        return;
      }
      const maybe = api.permissions.contains(
        { permissions: ['tabs'] },
        (granted) => resolve(!!granted),
      );
      // Firefox returns a Promise; Chrome uses the callback.
      if (maybe && typeof maybe.then === 'function') {
        maybe.then((granted) => resolve(!!granted)).catch(() => resolve(false));
      }
    });
  } catch {
    return Promise.resolve(false);
  }
}

function requestTabsPermission() {
  try {
    return new Promise((resolve) => {
      if (!api.permissions || !api.permissions.request) {
        resolve(false);
        return;
      }
      const maybe = api.permissions.request(
        { permissions: ['tabs'] },
        (granted) => resolve(!!granted),
      );
      if (maybe && typeof maybe.then === 'function') {
        maybe.then((granted) => resolve(!!granted)).catch(() => resolve(false));
      }
    });
  } catch {
    return Promise.resolve(false);
  }
}

// --- Ladder verification helpers -----------------------------------

// Host of a URL, www-stripped and lowercased. null on parse failure.
function bareHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

// A JobPost's link (or applyUrl) host must equal a known referrer host when
// one is in play — the referrer-host constraint that keeps T4/T5 honest.
function hostAgrees(found, constraintHost) {
  if (!constraintHost) return true;
  const linkHost = found.link ? bareHost(found.link) : null;
  const applyHost = found.applyUrl ? bareHost(found.applyUrl) : null;
  return linkHost === constraintHost || applyHost === constraintHost;
}

// Normalize a title for the T5 fuzzy compare: lowercase, punctuation → space,
// collapse whitespace.
function normalizeTitle(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Strict-ish title containment: one normalized title contains the other, or
// they share > ~80% of their tokens. Deliberately simple and conservative.
function titlesMatch(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const sa = new Set(na.split(' '));
  const sb = new Set(nb.split(' '));
  let shared = 0;
  for (const tok of sa) if (sb.has(tok)) shared++;
  const denom = Math.min(sa.size, sb.size) || 1;
  return shared / denom >= 0.8;
}

// Run the active-tab executeScript once to read document.referrer (UNGATED —
// full URL, no allowlist), the h1 text, and og:title. Best-effort; returns
// nulls on a restricted page.
async function grabLadderSignals(tabId) {
  const empty = { referrer: null, h1: null, ogTitle: null };
  try {
    const results = await api.scripting.executeScript({
      target: { tabId },
      func: () => {
        const h1El = document.querySelector('h1');
        const ogEl = document.querySelector('meta[property="og:title"]');
        return {
          referrer: document.referrer || null,
          h1: h1El ? (h1El.innerText || h1El.textContent || '').trim() : null,
          ogTitle: ogEl ? ogEl.getAttribute('content') : null,
        };
      },
    });
    const raw = results && results[0] && results[0].result;
    return raw || empty;
  } catch {
    return empty;
  }
}

// Collect candidate id-tokens from a tab URL's query params + fragment (T4).
// Values matching ID_TOKEN_RE, capped at 3, de-duplicated.
function collectIdTokens(tabUrl) {
  let parsed;
  try {
    parsed = new URL(tabUrl);
  } catch {
    return [];
  }
  const out = [];
  const seen = new Set();
  const consider = (val) => {
    if (out.length >= 3) return;
    if (val && ID_TOKEN_RE.test(val) && !seen.has(val)) {
      seen.add(val);
      out.push(val);
    }
  };
  for (const [, val] of parsed.searchParams) consider(val);
  // The fragment can carry `#/apply?jobId=...` or `#token` — scan its params
  // and its bare tail.
  const frag = parsed.hash ? parsed.hash.replace(/^#/, '') : '';
  if (frag) {
    const qIdx = frag.indexOf('?');
    if (qIdx >= 0) {
      const fragParams = new URLSearchParams(frag.slice(qIdx + 1));
      for (const [, val] of fragParams) consider(val);
    }
    for (const part of frag.split(/[/?&=#]/)) consider(part);
  }
  return out;
}

// The signal ladder. Returns { found, tentative } for the first verified tier,
// or null. `budget` bounds server lookups (roundtrip diet). Never throws.
async function runSignalLadder(tab, apiKey) {
  const budget = { left: LADDER_MAX_LOOKUPS };
  const lookup = async (url) => {
    if (budget.left <= 0) return null;
    budget.left -= 1;
    return lookupExistingJobPost(url, apiKey);
  };
  const search = async (query) => {
    if (budget.left <= 0) return null;
    budget.left -= 1;
    return fetchPosts(apiKey, { query, limit: 10 });
  };

  let referrerHost = null; // set by T3 when the referrer is origin-only

  try {
    const tabsGranted = await hasTabsPermission();

    // T1 — opener tab. The page that spawned this apply tab is usually the
    // job listing itself.
    if (tabsGranted && tab.openerTabId != null) {
      try {
        const opener = await api.tabs.get(tab.openerTabId);
        if (opener && opener.url && classifyUrl(opener.url).ok) {
          const found = await lookup(opener.url);
          if (found && found.id) return { found, tentative: false };
        }
      } catch {
        // opener gone / restricted — fall through
      }
    }

    // T2 — open-tabs scan. Check the stash (free) first, then the server for
    // a bounded set of same-origin-deduped candidates.
    if (tabsGranted) {
      let openTabs = [];
      try {
        openTabs = await api.tabs.query({});
      } catch {
        openTabs = [];
      }
      const trackedMap = await readPageStash(
        CC_TRACKED_PAGES_KEY,
        TRACKED_STASH_TTL_MS,
      );
      const candidates = [];
      const seenOrigins = new Set();
      // Prefer same-window tabs first.
      openTabs.sort((a, b) => {
        const aw = a.windowId === tab.windowId ? 0 : 1;
        const bw = b.windowId === tab.windowId ? 0 : 1;
        return aw - bw;
      });
      for (const t of openTabs) {
        if (!t.url || t.id === tab.id) continue;
        const verdict = classifyUrl(t.url);
        if (!verdict.ok) continue; // excludes CC self-hosts + non-http(s)
        // Stash hit is free — take it immediately.
        const cached = trackedMap[t.url];
        if (cached && cached.found && cached.found.id) {
          return { found: cached.found, tentative: false };
        }
        const origin = originOf(t.url);
        if (origin && seenOrigins.has(origin)) continue;
        if (origin) seenOrigins.add(origin);
        candidates.push(t.url);
        if (candidates.length >= 6) break;
      }
      for (const url of candidates) {
        const found = await lookup(url);
        if (found && found.id) return { found, tentative: false };
      }
    }

    // Read referrer + title signals once (used by T3/T5) — UNGATED referrer.
    const signals = tab.id != null ? await grabLadderSignals(tab.id) : {};

    // T3 — referrer. A full referrer URL (with a path) is a standalone
    // trigger; an origin-only referrer only constrains T4/T5.
    if (signals.referrer) {
      let refParsed = null;
      try {
        refParsed = new URL(signals.referrer);
      } catch {
        refParsed = null;
      }
      if (refParsed && classifyUrl(signals.referrer).ok) {
        const hasPath = refParsed.pathname && refParsed.pathname !== '/';
        if (hasPath) {
          const found = await lookup(signals.referrer);
          if (found && found.id) return { found, tentative: false };
        }
        // Retain the referrer host to constrain the fuzzy tiers below.
        referrerHost = bareHost(signals.referrer);
      }
    }

    // T4 — id tokens from the tab URL. Search each; accept only a row whose
    // link actually contains the token (and agrees with the referrer host).
    const tokens = collectIdTokens(tab.url);
    for (const token of tokens) {
      const rows = await search(token);
      if (!rows) continue;
      const verified = rows.filter(
        (r) =>
          r &&
          r.id &&
          r.link &&
          r.link.includes(token) &&
          hostAgrees(r, referrerHost),
      );
      if (verified.length === 1) {
        return { found: verified[0], tentative: false };
      }
    }

    // T5 — title on page. Prefer og:title; fall back to a non-generic h1.
    const pageTitle = pickPageTitle(signals.h1, signals.ogTitle);
    if (pageTitle) {
      const rows = await search(pageTitle);
      if (rows) {
        const matches = rows.filter(
          (r) =>
            r &&
            r.id &&
            titlesMatch(r.title, pageTitle) &&
            hostAgrees(r, referrerHost),
        );
        if (matches.length === 1) {
          return { found: matches[0], tentative: false };
        }
      }
    }

    // T6 — viewed-JP trail. Offer the most recent viewed post (tentatively),
    // preferring one whose link host matches the referrer host.
    //
    // CROSS-ORIGIN ONLY: the trail models the apply-flow signature — view a
    // posting on site A, land on ATS site B. A candidate whose link host
    // equals the CURRENT page's host means we're still browsing that same
    // portal, where a lookup miss just means a different job — offering the
    // last-viewed one is the single-origin-portal trap (toptal hosts every
    // job on one origin; live misfire 2026-07-08 on /portal/eligible-jobs,
    // same failure family as the reverted 1.8.3 origin-match suggestion).
    const tabHost = bareHost(tab.url);
    const viewed = (await loadViewedPosts()).filter(
      (v) => bareHost(v.link) !== tabHost,
    );
    if (viewed.length) {
      let pick = viewed[0];
      if (referrerHost) {
        const hostMatch = viewed.find((v) => bareHost(v.link) === referrerHost);
        if (hostMatch) pick = hostMatch;
      }
      return { found: pick, tentative: true };
    }
  } catch (err) {
    console.warn('[cc-sender] signal ladder failed', err);
    return null;
  }
  return null;
}

// Choose the more job-title-looking of h1 / og:title. og:title wins when the
// h1 is empty or looks generic (very short, or a bare site/section name).
function pickPageTitle(h1, ogTitle) {
  const h = (h1 || '').trim();
  const og = (ogTitle || '').trim();
  const generic = !h || h.length < 4 || /^(jobs?|careers?|apply)$/i.test(h);
  if (og && generic) return og;
  return h || og || null;
}

// --- Ladder offer card ---------------------------------------------

function resetLadderOfferCard() {
  pendingLadderOffer = null;
  if (ladderOfferCard) ladderOfferCard.classList.add('hidden');
  if (ladderOfferBtn) {
    ladderOfferBtn.classList.remove('hidden');
    ladderOfferBtn.disabled = false;
    delete ladderOfferBtn.dataset.state;
  }
  if (ladderOfferDismissBtn) ladderOfferDismissBtn.classList.remove('hidden');
  if (ladderOfferLinkEl) ladderOfferLinkEl.classList.add('hidden');
  if (ladderOfferStatus) setStatus(ladderOfferStatus, '');
}

function showLadderOfferOpenLink(appId, label, jobPostId) {
  if (ladderOfferBtn) ladderOfferBtn.classList.add('hidden');
  if (ladderOfferDismissBtn) ladderOfferDismissBtn.classList.add('hidden');
  if (ladderOfferLinkEl && appId) {
    ladderOfferLinkEl.href = jobPostId
      ? `${FRONTEND_ORIGIN}/job-posts/${jobPostId}/job-applications/${appId}`
      : `${FRONTEND_ORIGIN}/job-applications/${appId}`;
    ladderOfferLinkEl.classList.remove('hidden');
  }
  if (ladderOfferStatus) setStatus(ladderOfferStatus, label || '', 'success');
}

// Render the ladder offer on the Applications tab. `offer` is the ladder
// result { found, tentative }; `tabUrl` is the page to track against.
function renderLadderOffer(offer, tabUrl) {
  if (!ladderOfferCard || !offer || !offer.found) return;
  pendingLadderOffer = { ...offer, tabUrl };
  const found = offer.found;
  if (ladderOfferLeadEl) {
    ladderOfferLeadEl.textContent = offer.tentative
      ? 'Were you applying to'
      : 'Applying to';
  }
  if (ladderOfferTitleEl) {
    ladderOfferTitleEl.textContent = found.title || '(untitled job post)';
  }
  if (ladderOfferCompanyEl) {
    ladderOfferCompanyEl.textContent = found.company || '';
  }
  ladderOfferCard.classList.remove('hidden');
  // An application moment — land on the Applications tab where the card lives.
  setActiveTab('applications');
}

// Confirm: create the JobApplication (tracking_url = tab.url) AND backfill
// the post's apply_url when it's empty (two-click overwrite when occupied +
// different). Dedupe first, mirroring confirmApplyAttribution.
async function confirmLadderOffer() {
  const offer = pendingLadderOffer;
  if (!offer || !offer.found) return;
  const found = offer.found;
  if (ladderOfferBtn) {
    ladderOfferBtn.disabled = true;
    ladderOfferBtn.dataset.state = 'sending';
  }
  if (ladderOfferStatus) setStatus(ladderOfferStatus, 'Checking…');

  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) {
    if (ladderOfferStatus) setStatus(ladderOfferStatus, 'Not connected.', 'error');
    if (ladderOfferBtn) {
      ladderOfferBtn.disabled = false;
      delete ladderOfferBtn.dataset.state;
    }
    return;
  }

  // Dedupe first.
  const existing = await findExistingApplication(found.id, saved.ccApiKey);
  if (existing && existing.appId) {
    showLadderOfferOpenLink(existing.appId, 'Already tracked', found.id);
    await backfillApplyUrlFor(found, offer.tabUrl, saved.ccApiKey);
    return;
  }
  if (existing && existing.error) {
    if (ladderOfferStatus) {
      setStatus(ladderOfferStatus, 'Could not reach Career Caddy.', 'error');
    }
    if (ladderOfferBtn) {
      ladderOfferBtn.disabled = false;
      delete ladderOfferBtn.dataset.state;
    }
    return;
  }

  if (ladderOfferStatus) setStatus(ladderOfferStatus, 'Tracking…');
  const res = await postJobApplication({
    jobPostId: found.id,
    trackingUrl: offer.tabUrl,
    apiKey: saved.ccApiKey,
  });
  if (!res.ok) {
    if (ladderOfferStatus) setStatus(ladderOfferStatus, res.error, 'error');
    if (ladderOfferBtn) {
      ladderOfferBtn.disabled = false;
      delete ladderOfferBtn.dataset.state;
    }
    return;
  }
  showLadderOfferOpenLink(res.appId, 'Tracked ✓', found.id);
  await backfillApplyUrlFor(found, offer.tabUrl, saved.ccApiKey);
}

// Backfill JP.apply_url = tabUrl. The JA has already been created (this runs
// after tracking succeeds), so this is a secondary convenience write:
//   - apply_url empty      → PATCH it to this page.
//   - apply_url == tabUrl   → no-op (already this page).
//   - apply_url different   → DON'T clobber. The manual two-click overwrite
//     lives on the Posts-tab "Link this page" flow (linkCurrentPageTo), where
//     the button stays live; forcing it here — after the confirm button is
//     already gone — would leave a dead instruction. Leave the existing link
//     and note it, so the user knows nothing was silently overwritten.
async function backfillApplyUrlFor(found, tabUrl, apiKey) {
  if (!found || !found.id || !tabUrl) return;
  if (found.applyUrl === tabUrl) return; // already set to this page
  if (found.applyUrl) {
    // Occupied + different — respect it. (Posts tab can replace it manually.)
    return;
  }
  try {
    await fetch(`${ORIGIN}/api/v1/job-posts/${found.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'job-post',
          id: String(found.id),
          attributes: { apply_url: tabUrl },
        },
      }),
    });
    // Memo locally so a T6 viewed-trail re-offer knows the link is set.
    found.applyUrl = tabUrl;
  } catch (err) {
    console.warn('[cc-sender] ladder apply_url backfill failed', err);
  }
}

if (ladderOfferBtn) {
  ladderOfferBtn.addEventListener('click', confirmLadderOffer);
}
if (ladderOfferDismissBtn) {
  ladderOfferDismissBtn.addEventListener('click', () => {
    if (pendingLadderOffer && pendingLadderOffer.tabUrl) {
      dismissedLadderUrls.add(pendingLadderOffer.tabUrl);
    }
    resetLadderOfferCard();
  });
}

// Entry point invoked from the lookup miss branch. Runs the ladder, renders
// the offer on a hit. Wrapped so any failure degrades to the miss behavior.
// Skips URLs the user dismissed this session; if tabs isn't granted, still
// runs the ungated tiers (referrer/id-token/title/viewed-trail).
async function maybeOfferFromLadder(tab, apiKey) {
  if (!tab || !tab.url) return;
  if (dismissedLadderUrls.has(tab.url)) return;

  // CC-135 (1.8.12): an agentic match-application for THIS url may already be
  // in flight (or done) from a prior popup session. Consult the stash first —
  // a resumed result surfaces on the match-result card instead of re-walking
  // the ladder.
  if (await maybeResumeMatchApplication(tab, apiKey)) {
    if (activeTab === 'tools') return;
    await refreshTabsOptin(tab, apiKey);
    refreshAskAgentButton();
    return;
  }

  let offer = null;
  try {
    offer = await runSignalLadder(tab, apiKey);
  } catch {
    offer = null;
  }
  // A late result must not yank the user off another tab.
  if (activeTab === 'tools') return;
  if (offer && offer.found) {
    renderLadderOffer(offer, tab.url);
  }
  // Refresh the tabs opt-in affordance regardless — a miss with tabs absent
  // is exactly when we want to invite the broader scan.
  await refreshTabsOptin(tab, apiKey);
  // CC-135: with the free ladder missed and the user staff, offer the paid
  // agentic lookup. refreshAskAgentButton no-ops for non-staff / with an
  // offer already on screen.
  refreshAskAgentButton();
}

// Show / hide the "Enable tab matching" affordance in the Applications empty
// state. Shown only when: tabs is NOT granted, the user hasn't dismissed the
// prompt, and there's no offer already on screen.
async function refreshTabsOptin(tab, apiKey) {
  if (!tabsOptinEl) return;
  const granted = await hasTabsPermission();
  let dismissed = false;
  try {
    const got = await api.storage.local.get([CC_TABS_OPTIN_DISMISSED_KEY]);
    dismissed = got[CC_TABS_OPTIN_DISMISSED_KEY] === true;
  } catch {
    dismissed = false;
  }
  const show = !granted && !dismissed && !pendingLadderOffer;
  tabsOptinEl.classList.toggle('hidden', !show);
  // Stash the current tab so the grant handler can re-run the ladder.
  if (show) {
    tabsOptinEl.dataset.tabId = tab && tab.id != null ? String(tab.id) : '';
  }
}

if (tabsOptinBtn) {
  tabsOptinBtn.addEventListener('click', async () => {
    const granted = await requestTabsPermission();
    if (!granted) {
      // Remember the decline so we don't nag on every open.
      try {
        await api.storage.local.set({ [CC_TABS_OPTIN_DISMISSED_KEY]: true });
      } catch {
        // best-effort
      }
      if (tabsOptinEl) tabsOptinEl.classList.add('hidden');
      return;
    }
    if (tabsOptinEl) tabsOptinEl.classList.add('hidden');
    // Re-run the ladder now that the broader tiers are available.
    let saved;
    try {
      saved = await api.storage.local.get(['ccApiKey']);
    } catch {
      saved = null;
    }
    if (!saved || !saved.ccApiKey) return;
    let tab;
    try {
      [tab] = await api.tabs.query({ active: true, currentWindow: true });
    } catch {
      tab = null;
    }
    if (tab && tab.url) maybeOfferFromLadder(tab, saved.ccApiKey);
  });
}

// --- CC-135 (1.8.12): agentic JP lookup, folded into JobApplication ----
//
// The free ladder (T1-T6) missed and the user is staff. The user DID apply, so
// clicking TRACKS the application up front (POST /job-applications/ carrying a
// match_context) and asks Career Caddy to find its job post. The api creates
// the JA (status pending), an async matcher backfills the JA's job_post FK, and
// we poll the JA for the outcome. Result renders in the #match-result card:
//   - done + matched post -> Tracked state, JP title/company/confidence/
//     rationale, Open-application link, apply_url backfill when empty.
//   - done + null pick    -> honest "Tracked — no matching post found; link it
//     manually" pointing at the Posts-tab link tool.
//   - failed              -> honest error; the JA still exists.
// A background alarm fallback (see background.js cc-match-app-* handling) plus a
// url-keyed { jaId } stash carry a closed-popup result to the next open.

// Grab the top frame's visible text (the application context), truncated
// client-side. Reuses the executeScript idiom of grabPayload; top frame only —
// the excerpt is a matching hint, not the full multi-frame capture the send
// path needs. Never throws.
async function grabPageExcerpt(tabId) {
  try {
    const results = await api.scripting.executeScript({
      target: { tabId },
      func: () => (document.body ? document.body.innerText : ''),
    });
    const text = results && results[0] && results[0].result;
    return typeof text === 'string' ? text.slice(0, MATCH_APP_EXCERPT_MAX) : '';
  } catch {
    return '';
  }
}

// POST a match-application (a JA create carrying a match_context trigger). Flat
// body — the api accepts flat or a JSON:API envelope. tracking_url = the ATS
// page (server-validated). The matcher backfills job_post, so we send NO
// job-post relationship here. Returns { ok, jaId } or { ok:false, error }.
async function postMatchApplication({
  trackingUrl,
  referrer,
  pageTitle,
  excerpt,
  apiKey,
}) {
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
        tracking_url: trackingUrl,
        status: 'Applied',
        match_context: {
          referrer: referrer || '',
          page_title: pageTitle || '',
          text_excerpt: excerpt || '',
        },
      }),
    });
  } catch (err) {
    return { ok: false, error: `Network error: ${err.message}` };
  }
  if (resp.status === 401 || resp.status === 403) {
    return { ok: false, error: 'Not entitled — staff only.' };
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
  const jaId = body?.data?.id || null;
  return jaId ? { ok: true, jaId } : { ok: false, error: 'No application id returned.' };
}

// GET a JA (with the matched JobPost + its company sideloaded) and read its
// match_context. Returns { status, confidence, rationale, jpId, found } —
// `found` is the offer-card JobPost shape (see fetchPosts) or null. Null on a
// transport/parse failure so the poller just retries.
async function pollMatchApplicationOnce(jaId, apiKey) {
  let resp;
  try {
    resp = await fetch(
      `${ORIGIN}/api/v1/job-applications/${jaId}/?include=job-post,company`,
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
  if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
    return { status: 'failed', confidence: null, rationale: '', jpId: null, found: null };
  }
  if (!resp.ok) return null;
  let body;
  try {
    body = await resp.json();
  } catch {
    return null;
  }
  const attrs = body?.data?.attributes || {};
  const ctx = (attrs.match_context && typeof attrs.match_context === 'object')
    ? attrs.match_context
    : {};
  const jpId = body?.data?.relationships?.['job-post']?.data?.id || null;
  const found = jpId ? buildJpFromIncluded(jpId, body.included) : null;
  return {
    status: ctx.status || null,
    confidence: typeof ctx.confidence === 'number' ? ctx.confidence : null,
    rationale: ctx.rationale || '',
    jpId,
    found,
  };
}

// Build the offer-card JobPost shape from a sideloaded `included` array, so the
// Tracked-state render + apply_url backfill reuse the existing idioms.
function buildJpFromIncluded(jpId, included) {
  const arr = Array.isArray(included) ? included : [];
  const jp = arr.find(
    (r) => r && r.type === 'job-post' && String(r.id) === String(jpId),
  );
  if (!jp) return null;
  const attrs = jp.attributes || {};
  const companyRel = jp.relationships?.company?.data;
  let company = null;
  if (companyRel) {
    const inc = arr.find(
      (r) =>
        r &&
        (r.type === 'company' || r.type === 'companies') &&
        String(r.id) === String(companyRel.id),
    );
    company = inc?.attributes?.name || null;
  }
  return {
    id: jp.id,
    title: attrs.title,
    company,
    companyId: companyRel ? String(companyRel.id) : null,
    applyUrl: attrs.apply_url || null,
    link: attrs.link || null,
    topScore: typeof attrs.top_score === 'number' ? attrs.top_score : null,
    hasPendingScore: false,
    complete: attrs.complete === false ? false : true,
  };
}

function resetMatchResultCard() {
  if (matchResultCard) matchResultCard.classList.add('hidden');
  if (matchResultLinkEl) matchResultLinkEl.classList.add('hidden');
  if (matchResultStatus) setStatus(matchResultStatus, '');
  if (matchResultTitleEl) matchResultTitleEl.textContent = '';
  if (matchResultCompanyEl) matchResultCompanyEl.textContent = '';
}

// Render the matcher outcome into the #match-result card. The JA already
// exists (tracked on click) — this is an OUTCOME, not a confirm step. `jaId` is
// the created application; `tabUrl` the tracked page.
async function renderMatchResult(result, jaId, tabUrl, apiKey) {
  matchAppInFlight = false;
  if (!matchResultCard) return;
  matchResultCard.classList.remove('hidden');
  // The card owns the screen now — retire the ask-agent affordance.
  resetAskAgentButton();
  if (askAgentEl) askAgentEl.classList.add('hidden');
  // An application moment — land on the Applications tab where the card lives.
  if (activeTab !== 'tools') setActiveTab('applications');

  const jaOpenHref = (jpId) =>
    jpId
      ? `${FRONTEND_ORIGIN}/job-posts/${jpId}/job-applications/${jaId}`
      : `${FRONTEND_ORIGIN}/job-applications/${jaId}`;

  if (result && result.status === 'done' && result.found && result.found.id) {
    const found = result.found;
    if (matchResultLeadEl) {
      const pct =
        typeof result.confidence === 'number'
          ? ` · ${Math.round(result.confidence * 100)}% match`
          : '';
      matchResultLeadEl.textContent = `Tracked — Career Caddy found${pct}`;
    }
    if (matchResultTitleEl) {
      matchResultTitleEl.textContent = found.title || '(untitled job post)';
    }
    if (matchResultCompanyEl) matchResultCompanyEl.textContent = found.company || '';
    if (matchResultLinkEl) {
      matchResultLinkEl.href = jaOpenHref(found.id);
      matchResultLinkEl.classList.remove('hidden');
    }
    if (matchResultStatus && result.rationale) {
      setStatus(matchResultStatus, result.rationale, 'success');
    }
    // Backfill JP.apply_url = tabUrl when empty (reuses the ladder idiom;
    // occupied/different links are respected, not clobbered).
    await backfillApplyUrlFor(found, tabUrl, apiKey);
    return;
  }

  if (result && result.status === 'done') {
    // Null pick — the JA stays honestly unlinked. Point at the manual tool.
    if (matchResultLeadEl) matchResultLeadEl.textContent = 'Tracked';
    if (matchResultTitleEl) matchResultTitleEl.textContent = 'No matching job post found';
    if (matchResultCompanyEl) matchResultCompanyEl.textContent = '';
    if (matchResultLinkEl) {
      matchResultLinkEl.href = jaOpenHref(null);
      matchResultLinkEl.classList.remove('hidden');
    }
    if (matchResultStatus) {
      setStatus(
        matchResultStatus,
        result.rationale
          ? `${result.rationale} — link it manually from the Posts tab.`
          : 'Link it manually from the Posts tab.',
      );
    }
    return;
  }

  // failed — the JA still exists; be honest.
  if (matchResultLeadEl) matchResultLeadEl.textContent = 'Tracked';
  if (matchResultTitleEl) matchResultTitleEl.textContent = 'Lookup failed';
  if (matchResultCompanyEl) matchResultCompanyEl.textContent = '';
  if (matchResultLinkEl) {
    matchResultLinkEl.href = jaOpenHref(null);
    matchResultLinkEl.classList.remove('hidden');
  }
  if (matchResultStatus) {
    setStatus(
      matchResultStatus,
      'The application is tracked, but finding its job post failed. Link it manually from the Posts tab.',
      'error',
    );
  }
}

// Poll the JA from the open popup. On terminal match_context.status render the
// result; if the popup outlives the budget without a terminal status, the
// background alarm (registered at POST time) carries it to the next open.
function startMatchAppPolling(jaId, tabUrl, apiKey) {
  stopMatchAppPolling();
  let polls = 0;
  matchAppPollTimer = setInterval(async () => {
    polls += 1;
    if (polls > MATCH_APP_POLL_MAX) {
      stopMatchAppPolling();
      // Hand off to the background alarm — leave the button in its Searching…
      // state; the stash + alarm surface the result on the next open.
      return;
    }
    let result;
    try {
      result = await pollMatchApplicationOnce(jaId, apiKey);
    } catch {
      result = null;
    }
    if (!result || !result.status) return; // transient — keep polling
    if (result.status === 'pending') return;
    // done / failed — terminal.
    stopMatchAppPolling();
    await removePageStash(CC_MATCH_APPS_KEY, tabUrl);
    if (activeTab === 'tools') return; // don't yank the user off the Tools tab
    await renderMatchResult(result, jaId, tabUrl, apiKey);
  }, MATCH_APP_POLL_INTERVAL_MS);
}

function stopMatchAppPolling() {
  if (matchAppPollTimer != null) {
    clearInterval(matchAppPollTimer);
    matchAppPollTimer = null;
  }
}

// Register the background alarm fallback for a match-application. background.js
// polls the JA on its own alarm cadence and surfaces the result (stash +
// notification on a hit) even after the popup closes.
function armMatchAppBackground(jaId, tabUrl, apiKey) {
  try {
    api.runtime.sendMessage({
      type: 'cc-match-app-queued',
      jaId: String(jaId),
      url: tabUrl,
      origin: ORIGIN,
      apiKey,
      frontendOrigin: FRONTEND_ORIGIN,
    });
  } catch {
    // best-effort — the popup-side poll is the primary channel
  }
}

// Click handler: one POST per click. Track the application (create the JA with
// a match_context), flip the button to Searching…, stash + arm the background
// fallback, then poll the JA for the matcher outcome.
async function handleAskAgent() {
  if (matchAppInFlight) return;
  let tab;
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    tab = null;
  }
  if (!tab || !tab.url) return;
  const verdict = classifyUrl(tab.url);
  if (!verdict.ok) {
    if (askAgentStatus) setStatus(askAgentStatus, verdict.message, 'error');
    return;
  }
  let saved;
  try {
    saved = await api.storage.local.get(['ccApiKey']);
  } catch {
    saved = null;
  }
  if (!saved || !saved.ccApiKey) {
    if (askAgentStatus) setStatus(askAgentStatus, 'Not connected.', 'error');
    return;
  }

  matchAppInFlight = true;
  if (askAgentBtn) {
    askAgentBtn.disabled = true;
    askAgentBtn.dataset.state = 'sending';
    const lbl = askAgentBtn.querySelector('.btn-label');
    if (lbl) lbl.textContent = 'Tracking & searching…';
  }
  if (askAgentStatus) setStatus(askAgentStatus, 'Tracking your application…');

  // Reuse the ladder signal grab (referrer + og:title/h1) + the page excerpt.
  const signals = tab.id != null ? await grabLadderSignals(tab.id) : {};
  const pageTitle = pickPageTitle(signals.h1, signals.ogTitle) || tab.title || '';
  const excerpt = tab.id != null ? await grabPageExcerpt(tab.id) : '';

  const res = await postMatchApplication({
    trackingUrl: tab.url,
    referrer: signals.referrer || '',
    pageTitle,
    excerpt,
    apiKey: saved.ccApiKey,
  });
  if (!res.ok) {
    matchAppInFlight = false;
    if (askAgentBtn) {
      askAgentBtn.disabled = false;
      delete askAgentBtn.dataset.state;
      const lbl = askAgentBtn.querySelector('.btn-label');
      if (lbl) lbl.textContent = 'Track application & find its job post';
    }
    if (askAgentStatus) setStatus(askAgentStatus, res.error, 'error');
    return;
  }

  if (askAgentStatus) {
    setStatus(askAgentStatus, 'Tracked ✓ — finding its job post…');
  }
  await writePageStash(
    CC_MATCH_APPS_KEY,
    MATCH_APP_STASH_TTL_MS,
    MATCH_APP_STASH_MAX,
    tab.url,
    { jaId: String(res.jaId) },
  );
  armMatchAppBackground(res.jaId, tab.url, saved.ccApiKey);
  startMatchAppPolling(res.jaId, tab.url, saved.ccApiKey);
}

// On popup-open (from maybeOfferFromLadder), resume a stashed match-application
// for this url: if the matcher already finished, render it; if it's still
// pending, restore the Searching… state and resume popup-side polling. Returns
// true when it took ownership of the offer surface.
async function maybeResumeMatchApplication(tab, apiKey) {
  if (!tab || !tab.url) return false;
  const stash = await readPageStash(CC_MATCH_APPS_KEY, MATCH_APP_STASH_TTL_MS);
  const entry = stash[tab.url];
  if (!entry || !entry.jaId) return false;

  let result;
  try {
    result = await pollMatchApplicationOnce(entry.jaId, apiKey);
  } catch {
    result = null;
  }
  if (!result) return false; // transport hiccup — fall through to the ladder

  if (result.status === 'pending') {
    // Still working — show Searching… and resume the popup-side poll.
    matchAppInFlight = true;
    showAskAgentSearching();
    startMatchAppPolling(entry.jaId, tab.url, apiKey);
    return true;
  }
  // Terminal — render and clear the stash.
  await removePageStash(CC_MATCH_APPS_KEY, tab.url);
  await renderMatchResult(result, entry.jaId, tab.url, apiKey);
  return true;
}

// Show / hide the "Track application & find its job post" affordance in the
// Applications empty state. Shown only when: the user is staff and no offer
// (apply / ladder / match-result) is already on screen. A request in flight
// keeps the affordance up (it carries the Searching… state).
function refreshAskAgentButton() {
  if (!askAgentEl) return;
  if (matchAppInFlight) {
    askAgentEl.classList.remove('hidden');
    return;
  }
  const matchResultActive =
    !!(matchResultCard && !matchResultCard.classList.contains('hidden'));
  const offerActive =
    !!pendingApplyOffer || !!pendingLadderOffer || matchResultActive;
  const show = isStaff && !offerActive;
  askAgentEl.classList.toggle('hidden', !show);
}

function resetAskAgentButton() {
  matchAppInFlight = false;
  stopMatchAppPolling();
  if (askAgentBtn) {
    askAgentBtn.disabled = false;
    delete askAgentBtn.dataset.state;
    const lbl = askAgentBtn.querySelector('.btn-label');
    if (lbl) lbl.textContent = 'Track application & find its job post';
  }
  if (askAgentStatus) setStatus(askAgentStatus, '');
}

function showAskAgentSearching() {
  if (askAgentEl) askAgentEl.classList.remove('hidden');
  if (askAgentBtn) {
    askAgentBtn.disabled = true;
    askAgentBtn.dataset.state = 'sending';
    const lbl = askAgentBtn.querySelector('.btn-label');
    if (lbl) lbl.textContent = 'Tracking & searching…';
  }
  if (askAgentStatus) setStatus(askAgentStatus, 'Tracked ✓ — finding its job post…');
}

if (askAgentBtn) {
  askAgentBtn.addEventListener('click', handleAskAgent);
}

// ===================================================================
// CC #47 — ad-hoc "Answer the selected text"
// Self-contained region: read the active page selection, match a saved
// (favorite) Answer or generate one server-side (poll until terminal),
// then show it editable + copyable. The extension holds NO LLM key — the
// api's ai_assist path does the work; we just poll. Pending generation is
// stashed to chrome.storage.local so a popup close/reopen resumes.
// ===================================================================
const ANSWER_PENDING_KEY = 'ccAnswerPending';
const ANSWER_POLL_INTERVAL_MS = 2500;
const ANSWER_MAX_POLLS = 48; // ~2 min ceiling
const ANSWER_PENDING_MAX_AGE_MS = 10 * 60 * 1000;
let answerPolling = false;

function answerSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setAnswerBusy(busy) {
  if (!answerBtn) return;
  answerBtn.disabled = busy;
  if (busy) answerBtn.dataset.state = 'sending';
  else delete answerBtn.dataset.state;
}

function resetAnswerResult() {
  if (answerTextEl) {
    answerTextEl.value = '';
    answerTextEl.classList.add('hidden');
  }
  if (answerCopyBtn) answerCopyBtn.classList.add('hidden');
  hideAnswerPrompt();
}

// CCEXT-10: echo the captured selection (the question prompt) above the
// answer so the user can see WHAT is being answered — on both the fresh
// path and the resume-from-stash path.
function showAnswerPrompt(prompt) {
  if (!answerPromptEl || !answerPromptTextEl) return;
  const text = (prompt || '').trim();
  if (!text) {
    hideAnswerPrompt();
    return;
  }
  answerPromptTextEl.textContent = text;
  answerPromptEl.classList.remove('hidden');
}

function hideAnswerPrompt() {
  if (!answerPromptEl || !answerPromptTextEl) return;
  answerPromptTextEl.textContent = '';
  answerPromptEl.classList.add('hidden');
}

function showAnswerResult(content, message) {
  if (answerTextEl) {
    answerTextEl.value = content || '';
    answerTextEl.classList.remove('hidden');
  }
  if (answerCopyBtn) answerCopyBtn.classList.remove('hidden');
  setStatus(answerStatus, message || '', 'success');
}

function clearAnswerPending() {
  return api.storage.local.remove(ANSWER_PENDING_KEY).catch(() => {});
}

// Read the active tab's selection. allFrames so a selection inside an
// embedded ATS iframe is captured; first non-empty frame result wins.
async function readSelectionFromActiveTab() {
  let tab;
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
  } catch {
    return '';
  }
  if (!tab || tab.id == null) return '';
  try {
    const results = await api.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => (window.getSelection ? window.getSelection().toString() : ''),
    });
    if (!Array.isArray(results)) return '';
    for (const r of results) {
      const s = r && r.result ? String(r.result).trim() : '';
      if (s) return s;
    }
    return '';
  } catch {
    return '';
  }
}

// 1. Match first (free): GET /answers/?filter[query]=<sel>&include=question.
// The api has no `favorite` query param, so prefer a favorite client-side;
// else the most recent answer that already has content.
async function findExistingAnswer(selection, apiKey) {
  try {
    const url = `${ORIGIN}/api/v1/answers/?filter[query]=${encodeURIComponent(
      selection,
    )}&include=question`;
    const resp = await fetch(url, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!resp.ok) return null;
    const body = await resp.json();
    const rows = Array.isArray(body?.data) ? body.data : [];
    const withContent = rows.filter(
      (r) => r?.attributes?.content && String(r.attributes.content).trim(),
    );
    if (withContent.length === 0) return null;
    const fav = withContent.find((r) => r?.attributes?.favorite === true);
    const chosen = fav || withContent[0];
    return { id: chosen.id, content: chosen.attributes.content };
  } catch {
    return null;
  }
}

// 2a. Mint the Question (POST /questions/ {content} + relationships).
// CCEXT-10: attach the Question to the tracked JobPost (and its application,
// if one exists) so it's recorded against the post AND the api feeds the JD
// into the answer prompt (QuestionSerializer accepts `job-post`/`application`
// relationship keys). Returns the new id.
async function mintQuestion(content, apiKey, jobPostId, applicationId) {
  try {
    const relationships = {};
    if (jobPostId) {
      relationships['job-post'] = {
        data: { type: 'job-post', id: String(jobPostId) },
      };
    }
    if (applicationId) {
      relationships['application'] = {
        data: { type: 'job-application', id: String(applicationId) },
      };
    }
    const data = { type: 'question', attributes: { content } };
    if (Object.keys(relationships).length > 0) data.relationships = relationships;
    const resp = await fetch(`${ORIGIN}/api/v1/questions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ data }),
    });
    if (!resp.ok) return null;
    const body = await resp.json();
    return body?.data?.id || null;
  } catch {
    return null;
  }
}

// 2b. Request an AI answer (POST /answers/ {ai_assist:true} + question rel).
// With no content this returns 202 + status 'pending' (poll it). Returns id.
async function requestAiAnswer(questionId, apiKey) {
  try {
    const resp = await fetch(`${ORIGIN}/api/v1/answers/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'answer',
          attributes: { ai_assist: true },
          relationships: {
            question: { data: { type: 'question', id: String(questionId) } },
          },
        },
      }),
    });
    if (!resp.ok) return null;
    const body = await resp.json();
    return body?.data?.id || null;
  } catch {
    return null;
  }
}

// Poll GET /answers/:id/ until status is terminal (completed|failed) or the
// attempt cap is hit. Mirrors the scrape/score terminal-status poll idiom.
async function pollAnswerUntilTerminal(answerId, apiKey) {
  answerPolling = true;
  for (let attempt = 0; attempt < ANSWER_MAX_POLLS; attempt++) {
    await answerSleep(ANSWER_POLL_INTERVAL_MS);
    if (!answerPolling) return; // superseded by a newer request
    let attrs = null;
    try {
      const resp = await fetch(`${ORIGIN}/api/v1/answers/${answerId}/`, {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (resp.ok) {
        const body = await resp.json();
        attrs = body?.data?.attributes || null;
      }
    } catch {
      continue; // transient — retry until the cap
    }
    const status = attrs?.status || null;
    if (status === 'completed') {
      answerPolling = false;
      await clearAnswerPending();
      showAnswerResult(attrs.content || '', 'Generated.');
      setAnswerBusy(false);
      return;
    }
    if (status === 'failed') {
      answerPolling = false;
      await clearAnswerPending();
      setStatus(answerStatus, 'Answer generation failed — try again.', 'error');
      setAnswerBusy(false);
      return;
    }
  }
  // Hit the cap without a terminal state — keep the stash so a reopen resumes.
  answerPolling = false;
  setStatus(answerStatus, 'Still generating — reopen the popup to check again.');
  setAnswerBusy(false);
}

async function handleAnswerSelected() {
  if (answerPolling) return;
  // CCEXT-10: Answer is only offered for a tracked JobPost — the Question
  // must attach to a post to be recorded + answered with the JD in context.
  const jobPostId = trackedJobPostId;
  if (!jobPostId) {
    setStatus(
      answerStatus,
      'Open this on a tracked job post to answer its questions.',
      'error',
    );
    return;
  }
  const saved = await api.storage.local.get(['ccApiKey']);
  if (!saved.ccApiKey) {
    setStatus(answerStatus, 'Not connected.', 'error');
    return;
  }
  const selection = await readSelectionFromActiveTab();
  if (!selection) {
    setStatus(
      answerStatus,
      'Select a question on the page first, then click Answer.',
      'error',
    );
    return;
  }
  resetAnswerResult();
  showAnswerPrompt(selection); // CCEXT-10: echo the highlighted text
  setAnswerBusy(true);
  setStatus(answerStatus, 'Looking for a saved answer…');
  const match = await findExistingAnswer(selection, saved.ccApiKey);
  if (match && match.content) {
    showAnswerResult(match.content, 'Matched a saved answer.');
    setAnswerBusy(false);
    return;
  }
  // Tie the Question to the tracked post's application when one exists, so
  // the answer is recorded in the application's Q&A context too.
  let applicationId = null;
  const appLookup = await findExistingApplication(jobPostId, saved.ccApiKey);
  if (appLookup && appLookup.appId) applicationId = appLookup.appId;
  setStatus(answerStatus, 'Generating an answer…');
  const questionId = await mintQuestion(
    selection,
    saved.ccApiKey,
    jobPostId,
    applicationId,
  );
  if (!questionId) {
    setStatus(answerStatus, 'Could not create the question.', 'error');
    setAnswerBusy(false);
    return;
  }
  const answerId = await requestAiAnswer(questionId, saved.ccApiKey);
  if (!answerId) {
    setStatus(answerStatus, 'Could not start answer generation.', 'error');
    setAnswerBusy(false);
    return;
  }
  await api.storage.local
    .set({
      [ANSWER_PENDING_KEY]: {
        answerId,
        questionId,
        prompt: selection,
        startedAt: Date.now(),
      },
    })
    .catch(() => {});
  await pollAnswerUntilTerminal(answerId, saved.ccApiKey);
}

// CCEXT: on popup-open over a tracked job post, proactively read the page
// selection and echo it in the answer card so the highlighted question is
// visible IMMEDIATELY — no expanding a collapsed card, no click-just-to-see.
// Answering itself stays a deliberate click (handleAnswerSelected re-reads
// the same, still-live selection), so the user can eyeball the question
// before generating. Skips the resume path (maybeResumeAnswer owns a pending
// generation) and no-ops when there's no selection.
async function primeAnswerSelection() {
  if (!answerCardEl || !answerBtn || answerPolling) return;
  let saved;
  try {
    saved = await api.storage.local.get(['ccApiKey', ANSWER_PENDING_KEY]);
  } catch {
    saved = null;
  }
  // Don't fight the resume path — if a pending answer is stashed, let
  // maybeResumeAnswer drive the card instead.
  if (saved && saved[ANSWER_PENDING_KEY] && saved[ANSWER_PENDING_KEY].answerId) {
    return;
  }
  const selection = await readSelectionFromActiveTab();
  if (!selection) return;
  // The selection read is async; bail if the user has since moved off the
  // tracked screen (or the post cleared) so we never prime a stale card.
  if (currentSendScreenEl !== screenTracked || !trackedJobPostId) return;
  if (answerPolling) return;
  answerCardEl.open = true;
  resetAnswerResult();
  showAnswerPrompt(selection);
  // Free saved-answer match on open: if you've answered this exact question
  // before, surface it instantly (copy-ready) — no AI call, no writes. Novel
  // questions fall through to the click-to-generate path (handleAnswerSelected).
  const apiKey = saved && saved.ccApiKey;
  if (apiKey) {
    setStatus(answerStatus, 'Looking for a saved answer…');
    const match = await findExistingAnswer(selection, apiKey);
    // Bail if the user moved off this screen or a generation began while we
    // waited on the lookup.
    if (currentSendScreenEl !== screenTracked || answerPolling) return;
    if (match && match.content) {
      showAnswerResult(match.content, 'Matched a saved answer — copy it below.');
      return;
    }
  }
  setStatus(answerStatus, 'Highlighted — click Answer to respond.');
}

// Resume a pending generation after a popup close/reopen. Reads the stash;
// if fresh, polls the answer (it may have completed while the popup was
// closed) and resumes until terminal. Reads its own apiKey so it works on
// both the stored-key and freshly-SSO'd boot paths.
async function maybeResumeAnswer() {
  if (!answerCardEl || answerPolling) return;
  let saved;
  try {
    saved = await api.storage.local.get(['ccApiKey', ANSWER_PENDING_KEY]);
  } catch {
    return;
  }
  const apiKey = saved?.ccApiKey;
  const pending = saved?.[ANSWER_PENDING_KEY];
  if (!apiKey || !pending || !pending.answerId) return;
  if (Date.now() - (pending.startedAt || 0) > ANSWER_PENDING_MAX_AGE_MS) {
    await clearAnswerPending();
    return;
  }
  answerCardEl.open = true;
  showAnswerPrompt(pending.prompt); // CCEXT-10: echo the stashed selection
  setAnswerBusy(true);
  setStatus(answerStatus, 'Resuming a pending answer…');
  await pollAnswerUntilTerminal(pending.answerId, apiKey);
}

function copyAnswerToClipboard() {
  if (!answerTextEl || !answerCopyBtn) return;
  const value = answerTextEl.value || '';
  navigator.clipboard
    .writeText(value)
    .then(() => {
      const prev = answerCopyBtn.textContent;
      answerCopyBtn.textContent = 'Copied ✓';
      setTimeout(() => {
        answerCopyBtn.textContent = prev;
      }, 1200);
    })
    .catch(() => {
      setStatus(answerStatus, 'Copy failed.', 'error');
    });
}

if (answerBtn) answerBtn.addEventListener('click', handleAnswerSelected);
if (answerCopyBtn)
  answerCopyBtn.addEventListener('click', copyAnswerToClipboard);

loadTheme();
loadSaved();
