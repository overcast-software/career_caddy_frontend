const DEFAULT_ORIGIN = 'https://careercaddy.online';
const api = typeof browser !== 'undefined' ? browser : chrome;

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const originInput = $('origin');
const sendBtn = $('send');
const autoSubmitBox = $('auto-submit');
const autoScoreBox = $('auto-score');

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
    autoSubmitBox.checked = !!saved.ccAutoSubmit;
    autoScoreBox.checked = !!saved.ccAutoScore;
    syncAutoSubmitLock();
  } catch {
    originInput.value = DEFAULT_ORIGIN;
  }
}

originInput.addEventListener('change', () => {
  api.storage.local.set({ ccOrigin: getOrigin() }).catch(() => {});
});
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
