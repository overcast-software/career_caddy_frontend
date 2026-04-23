const DEFAULT_ORIGIN = 'https://careercaddy.online';
const api = typeof browser !== 'undefined' ? browser : chrome;

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const originInput = $('origin');
const sendBtn = $('send');

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

async function loadSavedOrigin() {
  try {
    const { ccOrigin } = await api.storage.local.get('ccOrigin');
    originInput.value = ccOrigin || DEFAULT_ORIGIN;
  } catch {
    originInput.value = DEFAULT_ORIGIN;
  }
}

originInput.addEventListener('change', () => {
  api.storage.local.set({ ccOrigin: getOrigin() }).catch(() => {});
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
  setStatus('Grabbing page…');
  try {
    const origin = getOrigin();
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active tab');

    const payload = await grabPayload(tab.id);
    if (!payload) throw new Error('Page read blocked (restricted URL?)');

    setStatus('Opening Career Caddy…');
    const ccTab = await api.tabs.create({
      url: `${origin}/job-posts/new/paste?ext=1`,
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

loadSavedOrigin();
