const DEFAULT_ORIGIN = 'https://careercaddy.online';
const api = typeof browser !== 'undefined' ? browser : chrome;

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const originInput = $('origin');
const sendBtn = $('send');
const autoSubmitBox = $('auto-submit');
const autoScoreBox = $('auto-score');
const versionEl = $('version');

// Read the installed extension's version from its own manifest so the
// user can visually confirm they're running the build they just loaded.
try {
  const mf = api.runtime.getManifest();
  versionEl.textContent = `v${mf.version}`;
} catch {
  versionEl.textContent = '';
}

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', isError);
}

function getOrigin() {
  const raw = (originInput.value || DEFAULT_ORIGIN).trim().replace(/\/$/, '');
  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

async function loadSaved() {
  try {
    const saved = await api.storage.local.get([
      'ccOrigin',
      'ccAutoSubmit',
      'ccAutoScore',
    ]);
    originInput.value = saved.ccOrigin || DEFAULT_ORIGIN;
    // First-install defaults: both toggles ON. Extension uninstall /
    // Firefox restart of a temp add-on wipes storage, so defaults need
    // to match the common-case preference to keep reinstalls painless.
    autoSubmitBox.checked =
      saved.ccAutoSubmit === undefined ? true : !!saved.ccAutoSubmit;
    autoScoreBox.checked =
      saved.ccAutoScore === undefined ? true : !!saved.ccAutoScore;
    syncAutoSubmitLock();
  } catch {
    originInput.value = DEFAULT_ORIGIN;
    autoSubmitBox.checked = true;
    autoScoreBox.checked = true;
    syncAutoSubmitLock();
  }
}

function saveOrigin() {
  api.storage.local.set({ ccOrigin: getOrigin() }).catch(() => {});
}
// 'change' fires only on blur — catch keystrokes too so origin saves
// without requiring the user to tab out before clicking Send.
originInput.addEventListener('change', saveOrigin);
originInput.addEventListener('input', saveOrigin);
function syncAutoSubmitLock() {
  // Score implies submit — lock the submit box checked whenever score is on.
  if (autoScoreBox.checked) {
    autoSubmitBox.checked = true;
    autoSubmitBox.disabled = true;
  } else {
    autoSubmitBox.disabled = false;
  }
}

autoSubmitBox.addEventListener('change', () => {
  api.storage.local
    .set({ ccAutoSubmit: autoSubmitBox.checked })
    .catch(() => {});
});
autoScoreBox.addEventListener('change', () => {
  syncAutoSubmitLock();
  api.storage.local
    .set({
      ccAutoScore: autoScoreBox.checked,
      ccAutoSubmit: autoSubmitBox.checked,
    })
    .catch(() => {});
});

async function grabPayload(tabId) {
  const results = await api.scripting.executeScript({
    target: { tabId },
    func: () => ({ url: location.href, text: document.body.innerText }),
  });
  return results && results[0] && results[0].result;
}

function buildTargetUrl(origin) {
  const params = new URLSearchParams({ bookmarklet: '1' });
  // Score implies submit — always ensure auto=1 when score=1 is set.
  if (autoSubmitBox.checked || autoScoreBox.checked) params.set('auto', '1');
  if (autoScoreBox.checked) params.set('score', '1');
  return `${origin}/job-posts/new/paste?${params.toString()}`;
}

sendBtn.addEventListener('click', async () => {
  sendBtn.disabled = true;
  setStatus('Grabbing page…');
  // Belt + suspenders: persist every setting on send in case change/input
  // events didn't fire (some Firefox popup close races drop them).
  try {
    await api.storage.local.set({
      ccOrigin: getOrigin(),
      ccAutoSubmit: autoSubmitBox.checked,
      ccAutoScore: autoScoreBox.checked,
    });
  } catch {
    /* ignore — best effort */
  }
  try {
    const origin = getOrigin();
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active tab');

    const payload = await grabPayload(tab.id);
    if (!payload) throw new Error('Page read blocked (restricted URL?)');

    setStatus('Opening Career Caddy…');
    const ccTab = await api.tabs.create({
      url: buildTargetUrl(origin),
      active: true,
    });

    const message = {
      type: 'cc-bookmarklet',
      url: payload.url,
      text: payload.text,
    };
    let tries = 0;
    const iv = setInterval(async () => {
      tries += 1;
      try {
        await api.scripting.executeScript({
          target: { tabId: ccTab.id },
          args: [message, origin],
          func: (m, o) => window.postMessage(m, o),
        });
      } catch {
        /* page not ready yet */
      }
      if (tries > 50) clearInterval(iv);
    }, 200);

    setTimeout(() => window.close(), 300);
  } catch (err) {
    setStatus(`Failed: ${err.message}`, true);
    sendBtn.disabled = false;
  }
});

loadSaved();
