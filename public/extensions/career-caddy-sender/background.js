// Service worker for Career Caddy Sender. Receives a scrape id from the
// popup, polls the API at a chrome.alarms-driven cadence, and fires an OS
// notification on terminal status. Survives popup close.
//
// Two polling phases:
//   1. Scrape poll  — wait for parse_scrape to land a JobPost.
//   2. Score poll   — only when the user enabled "Also score against
//                     career data". POSTs a Score, then waits for the
//                     async scorer to land a result, and fires a single
//                     "scored N ✓" notification instead of the plain
//                     "added" one. The user picked scoring, so the score
//                     IS the meaningful completion event.
//
// Chrome MV3 caveat: alarm intervals below 1 minute are clamped to 1 minute
// for non-foregrounded extensions. Firefox honors sub-minute intervals.
// We ask for 0.5 min (30s) and let the runtime decide.

const POLL_INTERVAL_MIN = 0.5;
const MAX_POLLS = 20;
const TERMINAL_SCRAPE = new Set([
  'completed',
  'failed',
  'error',
  'extract_fail',
  'obstacle_fail',
]);
const SUCCESS_SCRAPE = new Set(['completed']);
const TERMINAL_SCORE = new Set(['completed', 'failed']);
const SUCCESS_SCORE = new Set(['completed']);

const api = typeof browser !== 'undefined' ? browser : chrome;
const SCRAPE_PREFIX = 'cc-scrape-poll-';
const SCORE_PREFIX = 'cc-score-poll-';

function notify(title, message) {
  return api.notifications
    .create({
      type: 'basic',
      iconUrl: api.runtime.getURL('icons/icon48.png'),
      title,
      message,
    })
    .catch((err) => {
      console.warn('[cc-sender bg] notification failed', err);
    });
}

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'cc-scrape-queued') return false;
  const ctx = {
    scrapeId: String(msg.scrapeId),
    origin: msg.origin,
    apiKey: msg.apiKey,
    url: msg.url,
    autoScore: !!msg.autoScore,
    pollCount: 0,
  };
  const key = `scrape-${ctx.scrapeId}`;
  api.storage.session
    .set({ [key]: ctx })
    .then(() =>
      api.alarms.create(`${SCRAPE_PREFIX}${ctx.scrapeId}`, {
        periodInMinutes: POLL_INTERVAL_MIN,
        when: Date.now() + 2000,
      }),
    )
    .catch((err) => {
      console.warn('[cc-sender bg] queue failed', err);
    });
  if (typeof sendResponse === 'function') sendResponse({ ok: true });
  return false;
});

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith(SCRAPE_PREFIX)) {
    const scrapeId = alarm.name.slice(SCRAPE_PREFIX.length);
    pollScrapeOnce(scrapeId).catch((err) => {
      console.warn('[cc-sender bg] pollScrapeOnce threw', err);
    });
    return;
  }
  if (alarm.name.startsWith(SCORE_PREFIX)) {
    const scoreId = alarm.name.slice(SCORE_PREFIX.length);
    pollScoreOnce(scoreId).catch((err) => {
      console.warn('[cc-sender bg] pollScoreOnce threw', err);
    });
  }
});

async function pollScrapeOnce(scrapeId) {
  const key = `scrape-${scrapeId}`;
  const stored = await api.storage.session.get(key);
  const ctx = stored[key];
  if (!ctx) {
    await api.alarms.clear(`${SCRAPE_PREFIX}${scrapeId}`);
    return;
  }

  if (ctx.pollCount >= MAX_POLLS) {
    await api.alarms.clear(`${SCRAPE_PREFIX}${scrapeId}`);
    await api.storage.session.remove(key);
    notify(
      'Career Caddy — still processing',
      'Check your Career Caddy library for the result.',
    );
    return;
  }

  let resp;
  try {
    resp = await fetch(
      `${ctx.origin}/api/v1/scrapes/${scrapeId}/?include=job-post`,
      { headers: { Authorization: `Bearer ${ctx.apiKey}` } },
    );
  } catch (err) {
    console.warn('[cc-sender bg] scrape poll fetch failed', err);
    await api.storage.session.set({
      [key]: { ...ctx, pollCount: ctx.pollCount + 1 },
    });
    return;
  }

  if (resp.status === 401 || resp.status === 403) {
    await api.alarms.clear(`${SCRAPE_PREFIX}${scrapeId}`);
    await api.storage.session.remove(key);
    notify(
      'Career Caddy — session expired',
      'Reconnect the extension to keep submitting.',
    );
    return;
  }

  if (!resp.ok) {
    await api.storage.session.set({
      [key]: { ...ctx, pollCount: ctx.pollCount + 1 },
    });
    return;
  }

  let body;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }
  const status = body?.data?.attributes?.status;
  const jobPostId = body?.data?.relationships?.['job-post']?.data?.id;
  const includedJobPost = (body?.included || []).find(
    (r) => r?.type === 'job-post' && String(r.id) === String(jobPostId),
  );
  const jobTitle = includedJobPost?.attributes?.title || ctx.url;

  if (status && TERMINAL_SCRAPE.has(status)) {
    await api.alarms.clear(`${SCRAPE_PREFIX}${scrapeId}`);
    await api.storage.session.remove(key);

    if (!SUCCESS_SCRAPE.has(status)) {
      notify(
        'Career Caddy — could not parse',
        ctx.url || 'See Career Caddy for details.',
      );
      return;
    }

    // Scrape success path:
    //   - autoScore on  → kick off score POST + start scoreId poll loop;
    //                     the FINAL notification is the score result.
    //   - autoScore off → fire "added ✓" now.
    if (ctx.autoScore && jobPostId) {
      const ok = await beginScorePoll(ctx, jobPostId, jobTitle);
      if (!ok) {
        // Score POST failed (e.g. no career data) — fall back to the
        // creation notification so the user still hears something.
        notify('Career Caddy — added ✓', jobTitle);
      }
      return;
    }
    notify('Career Caddy — added ✓', jobTitle);
    return;
  }

  await api.storage.session.set({
    [key]: { ...ctx, pollCount: ctx.pollCount + 1 },
  });
}

async function beginScorePoll(ctx, jobPostId, jobTitle) {
  let resp;
  try {
    resp = await fetch(`${ctx.origin}/api/v1/scores/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${ctx.apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'scores',
          relationships: {
            'job-post': { data: { type: 'job-posts', id: String(jobPostId) } },
          },
        },
      }),
    });
  } catch (err) {
    console.warn('[cc-sender bg] score POST threw', err);
    return false;
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    console.warn('[cc-sender bg] score POST non-OK', resp.status, txt);
    return false;
  }
  let body;
  try {
    body = await resp.json();
  } catch {
    return false;
  }
  const scoreId = body?.data?.id;
  if (!scoreId) return false;

  const scoreCtx = {
    scoreId: String(scoreId),
    origin: ctx.origin,
    apiKey: ctx.apiKey,
    url: ctx.url,
    jobTitle,
    pollCount: 0,
  };
  await api.storage.session.set({ [`score-${scoreId}`]: scoreCtx });
  await api.alarms.create(`${SCORE_PREFIX}${scoreId}`, {
    periodInMinutes: POLL_INTERVAL_MIN,
    when: Date.now() + 3000,
  });
  return true;
}

async function pollScoreOnce(scoreId) {
  const key = `score-${scoreId}`;
  const stored = await api.storage.session.get(key);
  const ctx = stored[key];
  if (!ctx) {
    await api.alarms.clear(`${SCORE_PREFIX}${scoreId}`);
    return;
  }

  if (ctx.pollCount >= MAX_POLLS) {
    await api.alarms.clear(`${SCORE_PREFIX}${scoreId}`);
    await api.storage.session.remove(key);
    notify(
      'Career Caddy — score still pending',
      `${ctx.jobTitle} added; score is taking a while. Check Career Caddy.`,
    );
    return;
  }

  let resp;
  try {
    resp = await fetch(
      `${ctx.origin}/api/v1/scores/${scoreId}/?include=job-post`,
      { headers: { Authorization: `Bearer ${ctx.apiKey}` } },
    );
  } catch (err) {
    console.warn('[cc-sender bg] score poll fetch failed', err);
    await api.storage.session.set({
      [key]: { ...ctx, pollCount: ctx.pollCount + 1 },
    });
    return;
  }

  if (!resp.ok) {
    await api.storage.session.set({
      [key]: { ...ctx, pollCount: ctx.pollCount + 1 },
    });
    return;
  }

  let body;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }
  const status = body?.data?.attributes?.status;
  const value = body?.data?.attributes?.score;

  if (status && TERMINAL_SCORE.has(status)) {
    await api.alarms.clear(`${SCORE_PREFIX}${scoreId}`);
    await api.storage.session.remove(key);
    if (SUCCESS_SCORE.has(status) && typeof value === 'number') {
      notify(`Career Caddy — scored ${value} ✓`, ctx.jobTitle);
    } else if (SUCCESS_SCORE.has(status)) {
      notify('Career Caddy — scored ✓', ctx.jobTitle);
    } else {
      notify(
        'Career Caddy — added ✓ (score failed)',
        ctx.jobTitle,
      );
    }
    return;
  }

  await api.storage.session.set({
    [key]: { ...ctx, pollCount: ctx.pollCount + 1 },
  });
}
