const ORIGIN = 'https://api.careercaddy.online';
const STORAGE_KEYS = ['ccApiKey', 'ccKeyId', 'ccUsername', 'ccAutoScore'];
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
const versionEl = $('version');

const usernameInput = $('username');
const passwordInput = $('password');
const connectBtn = $('connect');
const connectStatus = $('connect-status');

const sendBtn = $('send');
const sendStatus = $('send-status');
const autoScoreBox = $('auto-score');
const whoEl = $('who');
const disconnectBtn = $('disconnect');
const themeToggleBtn = $('theme-toggle');

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
  if (themeToggleBtn) themeToggleBtn.innerHTML = dark ? SUN_SVG : MOON_SVG;
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

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', async () => {
    const { ccTheme = 'system', ccPalette = 'indigo' } =
      await api.storage.local.get(THEME_KEYS);
    const currentlyDark = isDarkMode(ccTheme);
    const next = currentlyDark ? 'light' : 'dark';
    await api.storage.local.set({ ccTheme: next });
    applyTheme(next, ccPalette);
  });
}

// On Connect, the user is logging into the CC site — best-effort import the
// app's theme from the active tab's localStorage so the popup matches.
async function importThemeFromActiveTab() {
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    const host = new URL(tab.url).hostname.toLowerCase();
    if (!SELF_HOSTS.has(host)) return;
    const results = await api.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        mode: localStorage.getItem('theme-mode'),
        palette: localStorage.getItem('theme-palette'),
      }),
    });
    const themeData = results && results[0] && results[0].result;
    if (!themeData) return;
    const updates = {};
    if (VALID_MODES.has(themeData.mode)) updates.ccTheme = themeData.mode;
    if (VALID_PALETTES.has(themeData.palette))
      updates.ccPalette = themeData.palette;
    if (Object.keys(updates).length) {
      await api.storage.local.set(updates);
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

function showConnect() {
  screenConnected.classList.add('hidden');
  screenConnect.classList.remove('hidden');
  passwordInput.value = '';
  setStatus(connectStatus, '');
  setTimeout(() => usernameInput.focus(), 50);
}

function showConnected(name) {
  screenConnect.classList.add('hidden');
  screenConnected.classList.remove('hidden');
  whoEl.textContent = name || '';
  setStatus(sendStatus, '');
}

function loadSaved() {
  return api.storage.local.get(STORAGE_KEYS).then((saved) => {
    autoScoreBox.checked =
      saved.ccAutoScore === undefined ? true : !!saved.ccAutoScore;
    if (saved.ccApiKey && saved.ccKeyId) {
      showConnected(saved.ccUsername);
      usernameInput.value = saved.ccUsername || '';
    } else {
      showConnect();
    }
    // Always best-effort re-sync theme from the active CC tab — covers users
    // who installed/updated the extension after their first connect, plus
    // picks up theme changes the user made in the app since last popup open.
    importThemeFromActiveTab();
  });
}

function persistAutoScore() {
  api.storage.local
    .set({ ccAutoScore: autoScoreBox.checked })
    .catch(() => {});
}

autoScoreBox.addEventListener('change', persistAutoScore);

function submitOnEnter(e) {
  if (e.key === 'Enter' && !connectBtn.disabled) {
    e.preventDefault();
    connectBtn.click();
  }
}
usernameInput.addEventListener('keydown', submitOnEnter);
passwordInput.addEventListener('keydown', submitOnEnter);

connectBtn.addEventListener('click', async () => {
  const username = (usernameInput.value || '').trim();
  const password = passwordInput.value;

  if (!username || !password) {
    setStatus(connectStatus, 'Username and password are required.', 'error');
    return;
  }

  connectBtn.disabled = true;
  setStatus(connectStatus, 'Authenticating…');

  let access;
  try {
    const resp = await fetch(`${ORIGIN}/api/v1/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (resp.status === 401 || resp.status === 400) {
      setStatus(connectStatus, 'Invalid username or password.', 'error');
      connectBtn.disabled = false;
      return;
    }
    if (!resp.ok) {
      setStatus(connectStatus, `Login failed (${resp.status}).`, 'error');
      connectBtn.disabled = false;
      return;
    }
    const body = await resp.json();
    access = body.access;
    if (!access) throw new Error('No access token in response');
  } catch (err) {
    setStatus(
      connectStatus,
      `Cannot reach Career Caddy: ${err.message}`,
      'error',
    );
    connectBtn.disabled = false;
    return;
  }

  setStatus(connectStatus, 'Creating API key…');

  const today = new Date().toISOString().slice(0, 10);
  let keyData;
  try {
    const resp = await fetch(`${ORIGIN}/api/v1/api-keys/`, {
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
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('[cc-sender] api-key create failed', resp.status, txt);
      setStatus(
        connectStatus,
        `Could not create API key (${resp.status}).`,
        'error',
      );
      connectBtn.disabled = false;
      return;
    }
    keyData = await resp.json();
  } catch (err) {
    setStatus(
      connectStatus,
      `Could not create API key: ${err.message}`,
      'error',
    );
    connectBtn.disabled = false;
    return;
  }

  const attrs = keyData?.data?.attributes || {};
  const keyId = keyData?.data?.id;
  const apiKey = attrs.key;
  if (!apiKey || !keyId) {
    setStatus(
      connectStatus,
      'API key response was malformed. Try again.',
      'error',
    );
    connectBtn.disabled = false;
    return;
  }

  await api.storage.local.set({
    ccApiKey: apiKey,
    ccKeyId: keyId,
    ccUsername: username,
  });

  passwordInput.value = '';
  connectBtn.disabled = false;
  setStatus(connectStatus, '');
  showConnected(username);
  importThemeFromActiveTab();
});

disconnectBtn.addEventListener('click', async () => {
  disconnectBtn.disabled = true;
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
  await api.storage.local.remove(['ccApiKey', 'ccKeyId', 'ccUsername']);
  disconnectBtn.disabled = false;
  showConnect();
});

async function grabPayload(tabId) {
  const results = await api.scripting.executeScript({
    target: { tabId },
    func: () => ({ url: location.href, text: document.body.innerText }),
  });
  return results && results[0] && results[0].result;
}

sendBtn.addEventListener('click', async () => {
  sendBtn.disabled = true;
  setStatus(sendStatus, 'Reading page…');

  const saved = await api.storage.local.get(['ccApiKey', 'ccKeyId']);
  if (!saved.ccApiKey) {
    setStatus(sendStatus, 'Not connected.', 'error');
    sendBtn.disabled = false;
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
        sendBtn.disabled = false;
        return;
      }
    }
    payload = await grabPayload(tab.id);
    if (!payload || !payload.text) {
      throw new Error('Page read blocked (restricted URL?)');
    }
  } catch (err) {
    setStatus(sendStatus, err.message, 'error');
    sendBtn.disabled = false;
    return;
  }

  setStatus(sendStatus, 'Sending…');

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
      }),
    });
  } catch (err) {
    setStatus(sendStatus, `Network error: ${err.message}`, 'error');
    sendBtn.disabled = false;
    return;
  }

  if (resp.status === 401 || resp.status === 403) {
    setStatus(sendStatus, 'Session expired — reconnecting required.', 'error');
    await api.storage.local.remove(['ccApiKey', 'ccKeyId', 'ccUsername']);
    sendBtn.disabled = false;
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
    api.notifications
      .create({
        type: 'basic',
        iconUrl: api.runtime.getURL('icons/icon48.png'),
        title: 'Career Caddy — already in your library',
        message: title,
      })
      .catch(() => {});
    setStatus(sendStatus, 'Already in your library.', 'success');
    setTimeout(() => window.close(), 1500);
    return;
  }

  if (!resp.ok) {
    const detail = body?.errors?.[0]?.detail || `HTTP ${resp.status}`;
    setStatus(sendStatus, `Error: ${detail}`, 'error');
    sendBtn.disabled = false;
    return;
  }

  const scrapeId = body?.data?.id;
  if (!scrapeId) {
    setStatus(sendStatus, 'Sent, but no scrape id returned.', 'error');
    sendBtn.disabled = false;
    return;
  }

  api.runtime
    .sendMessage({
      type: 'cc-scrape-queued',
      scrapeId,
      origin: ORIGIN,
      apiKey: saved.ccApiKey,
      url: payload.url,
      autoScore: autoScoreBox.checked,
    })
    .catch((err) => {
      console.warn('[cc-sender] background handoff failed', err);
    });

  setStatus(sendStatus, 'Sent ✓ — watch for a notification.', 'success');
  setTimeout(() => window.close(), 1500);
});

loadTheme();
loadSaved();
