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
// CC-135 (1.8.12): match-application terminal statuses (JA.match_context.status).
const TERMINAL_MATCH_APP = new Set(['done', 'failed']);

const api = typeof browser !== 'undefined' ? browser : chrome;
const SCRAPE_PREFIX = 'cc-scrape-poll-';
const SCORE_PREFIX = 'cc-score-poll-';
const MATCH_APP_PREFIX = 'cc-match-app-poll-';
const NOTIFY_LINKS_KEY = 'cc-notify-links';
// CC-135 (1.8.12): the popup reads this url-keyed stash on open to surface a
// match-application result that landed while the popup was closed. Mirrors the
// popup's ccMatchApps shape ({ url -> { jaId, ts, ... } }).
const MATCH_APP_STASH_KEY = 'ccMatchApps';
const MATCH_APP_STASH_TTL_MS = 30 * 60 * 1000; // 30m — matches the popup TTL

// Notifications can survive the popup closing and even the service worker
// going idle; the click-target URL has to be persisted, not held in memory.
async function rememberNotificationLink(notificationId, url) {
  if (!notificationId || !url) return;
  try {
    const stored = await api.storage.session.get(NOTIFY_LINKS_KEY);
    const map = stored[NOTIFY_LINKS_KEY] || {};
    map[notificationId] = url;
    await api.storage.session.set({ [NOTIFY_LINKS_KEY]: map });
  } catch (err) {
    console.warn('[cc-sender bg] could not remember notify link', err);
  }
}

async function consumeNotificationLink(notificationId) {
  try {
    const stored = await api.storage.session.get(NOTIFY_LINKS_KEY);
    const map = stored[NOTIFY_LINKS_KEY] || {};
    const url = map[notificationId];
    if (url) {
      delete map[notificationId];
      await api.storage.session.set({ [NOTIFY_LINKS_KEY]: map });
    }
    return url || null;
  } catch {
    return null;
  }
}

function notify(title, message, linkUrl) {
  // chrome.notifications.create resolves with the assigned id; pass the id
  // to rememberNotificationLink so onClicked can open the right page.
  return api.notifications
    .create({
      type: 'basic',
      iconUrl: api.runtime.getURL('icons/icon48.png'),
      title,
      message,
    })
    .then((notificationId) => {
      if (linkUrl) rememberNotificationLink(notificationId, linkUrl);
      return notificationId;
    })
    .catch((err) => {
      console.warn('[cc-sender bg] notification failed', err);
    });
}

api.notifications.onClicked.addListener((notificationId) => {
  consumeNotificationLink(notificationId).then((url) => {
    if (!url) return;
    api.tabs.create({ url }).catch((err) => {
      console.warn('[cc-sender bg] tabs.create failed', err);
    });
    api.notifications.clear(notificationId).catch(() => {});
  });
});

function jobPostUrl(frontendOrigin, jobPostId, withScores) {
  if (!jobPostId || !frontendOrigin) return null;
  return withScores
    ? `${frontendOrigin}/job-posts/${jobPostId}/scores`
    : `${frontendOrigin}/job-posts/${jobPostId}`;
}

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return false;
  if (msg.type === 'cc-scrape-queued') {
    const ctx = {
      scrapeId: String(msg.scrapeId),
      origin: msg.origin,
      apiKey: msg.apiKey,
      url: msg.url,
      autoScore: !!msg.autoScore,
      frontendOrigin: msg.frontendOrigin || 'https://careercaddy.online',
      skipAddedNotification: !!msg.skipAddedNotification,
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
  }
  if (msg.type === 'cc-notify-created') {
    // Fired by the popup the moment from-text returns 202 with a
    // job_post_id. Earlier than the bg scrape-poll path, so the user
    // gets feedback even if the popup closes immediately.
    const linkUrl = jobPostUrl(
      msg.frontendOrigin,
      msg.jobPostId,
      !!msg.withScores,
    );
    const title = msg.withScores
      ? 'Career Caddy — added ✓ — scoring…'
      : 'Career Caddy — added ✓';
    notify(title, msg.title || '', linkUrl);
    if (typeof sendResponse === 'function') sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'cc-notify-existing') {
    const linkUrl = jobPostUrl(msg.frontendOrigin, msg.jobPostId, false);
    notify('Career Caddy — already in your library', msg.title || '', linkUrl);
    if (typeof sendResponse === 'function') sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'cc-match-app-queued') {
    // CC-135 (1.8.12): the popup polls the JA while it's open; this alarm is
    // the fallback for when it closes before the matcher finishes. On terminal
    // match_context.status we stash the result to the url-keyed ccMatchApps
    // (so the next open renders it) and fire a single notification on a hit.
    const ctx = {
      jaId: String(msg.jaId),
      url: msg.url,
      origin: msg.origin,
      apiKey: msg.apiKey,
      frontendOrigin: msg.frontendOrigin || 'https://careercaddy.online',
      pollCount: 0,
    };
    const key = `match-app-${ctx.jaId}`;
    api.storage.session
      .set({ [key]: ctx })
      .then(() =>
        api.alarms.create(`${MATCH_APP_PREFIX}${ctx.jaId}`, {
          periodInMinutes: POLL_INTERVAL_MIN,
          when: Date.now() + 3000,
        }),
      )
      .catch((err) => {
        console.warn('[cc-sender bg] match-app queue failed', err);
      });
    if (typeof sendResponse === 'function') sendResponse({ ok: true });
    return false;
  }
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
    return;
  }
  if (alarm.name.startsWith(MATCH_APP_PREFIX)) {
    const jaId = alarm.name.slice(MATCH_APP_PREFIX.length);
    pollMatchAppOnce(jaId).catch((err) => {
      console.warn('[cc-sender bg] pollMatchAppOnce threw', err);
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

    // CCEXT reopen-memory: promote the popup's just-sent marker to a
    // tracked-page entry so the next popup open on this URL renders the
    // Tracked screen instantly instead of re-offering "Send this page".
    // Mirrors the popup's ccTrackedPages/ccSentPages shape (url-keyed, ts).
    if (jobPostId && ctx.url) {
      try {
        const got = await api.storage.local.get([
          'ccTrackedPages',
          'ccSentPages',
        ]);
        const tracked =
          got.ccTrackedPages && typeof got.ccTrackedPages === 'object'
            ? got.ccTrackedPages
            : {};
        tracked[ctx.url] = {
          found: {
            id: String(jobPostId),
            title: jobTitle,
            company: null,
            companyId: null,
            applyUrl: null,
            link: ctx.url,
            topScore: null,
            hasPendingScore: !!ctx.autoScore,
            complete: true,
          },
          ts: Date.now(),
        };
        const sent =
          got.ccSentPages && typeof got.ccSentPages === 'object'
            ? got.ccSentPages
            : {};
        delete sent[ctx.url];
        await api.storage.local.set({
          ccTrackedPages: tracked,
          ccSentPages: sent,
        });
      } catch (err) {
        console.warn('[cc-sender bg] tracked-stash promote failed', err);
      }
    }

    const postUrl = jobPostUrl(
      ctx.frontendOrigin,
      jobPostId,
      ctx.autoScore,
    );

    // Scrape success path:
    //   - autoScore on  → kick off score POST + start scoreId poll loop;
    //                     the FINAL notification is the score result.
    //   - autoScore off → fire "added ✓" now (unless popup already did).
    if (ctx.autoScore && jobPostId) {
      const ok = await beginScorePoll(ctx, jobPostId, jobTitle);
      if (!ok && !ctx.skipAddedNotification) {
        // Score POST failed (e.g. no career data) — fall back to the
        // creation notification so the user still hears something.
        notify('Career Caddy — added ✓', jobTitle, postUrl);
      }
      return;
    }
    if (!ctx.skipAddedNotification) {
      notify('Career Caddy — added ✓', jobTitle, postUrl);
    }
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
    jobPostId: String(jobPostId),
    frontendOrigin: ctx.frontendOrigin,
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
    // Score-completion notifications always link to /scores when the
    // user opted in (UX5) — that's where the meaningful detail lives.
    const scoreUrl = jobPostUrl(ctx.frontendOrigin, ctx.jobPostId, true);
    if (SUCCESS_SCORE.has(status) && typeof value === 'number') {
      notify(`Career Caddy — scored ${value} ✓`, ctx.jobTitle, scoreUrl);
    } else if (SUCCESS_SCORE.has(status)) {
      notify('Career Caddy — scored ✓', ctx.jobTitle, scoreUrl);
    } else {
      notify(
        'Career Caddy — added ✓ (score failed)',
        ctx.jobTitle,
        scoreUrl,
      );
    }
    return;
  }

  await api.storage.session.set({
    [key]: { ...ctx, pollCount: ctx.pollCount + 1 },
  });
}

// CC-135 (1.8.12): mark a match-application stash entry terminal so the next
// popup open for this url renders the result instead of resuming a poll. Prunes
// expired entries on write (TTL mirrors the popup).
async function markMatchAppStashResult(url, jaId, result) {
  if (!url) return;
  try {
    const got = await api.storage.local.get([MATCH_APP_STASH_KEY]);
    const raw =
      got[MATCH_APP_STASH_KEY] && typeof got[MATCH_APP_STASH_KEY] === 'object'
        ? got[MATCH_APP_STASH_KEY]
        : {};
    const now = Date.now();
    const map = {};
    for (const [u, entry] of Object.entries(raw)) {
      if (entry && entry.ts && now - entry.ts <= MATCH_APP_STASH_TTL_MS) {
        map[u] = entry;
      }
    }
    map[url] = { jaId: String(jaId), result, ts: now };
    await api.storage.local.set({ [MATCH_APP_STASH_KEY]: map });
  } catch (err) {
    console.warn('[cc-sender bg] match-app stash write failed', err);
  }
}

// Poll a JA's match_context from the background alarm — the fallback for when
// the popup closed before the matcher finished. On terminal status: stash the
// result (for the next open) and, on a hit, fire one notification linking to
// the matched post. A miss / failure updates the stash quietly (no nag) — the
// application is already tracked either way.
async function pollMatchAppOnce(jaId) {
  const key = `match-app-${jaId}`;
  const stored = await api.storage.session.get(key);
  const ctx = stored[key];
  if (!ctx) {
    await api.alarms.clear(`${MATCH_APP_PREFIX}${jaId}`);
    return;
  }

  if (ctx.pollCount >= MAX_POLLS) {
    await api.alarms.clear(`${MATCH_APP_PREFIX}${jaId}`);
    await api.storage.session.remove(key);
    return;
  }

  let resp;
  try {
    resp = await fetch(
      `${ctx.origin}/api/v1/job-applications/${jaId}/?include=job-post,company`,
      { headers: { Authorization: `Bearer ${ctx.apiKey}` } },
    );
  } catch (err) {
    console.warn('[cc-sender bg] match-app poll fetch failed', err);
    await api.storage.session.set({
      [key]: { ...ctx, pollCount: ctx.pollCount + 1 },
    });
    return;
  }

  if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
    await api.alarms.clear(`${MATCH_APP_PREFIX}${jaId}`);
    await api.storage.session.remove(key);
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
  const attrs = body?.data?.attributes || {};
  const matchCtx =
    attrs.match_context && typeof attrs.match_context === 'object'
      ? attrs.match_context
      : {};
  const status = matchCtx.status;

  if (status && TERMINAL_MATCH_APP.has(status)) {
    await api.alarms.clear(`${MATCH_APP_PREFIX}${jaId}`);
    await api.storage.session.remove(key);

    const jpId = body?.data?.relationships?.['job-post']?.data?.id || null;
    const included = Array.isArray(body?.included) ? body.included : [];
    const jp = jpId
      ? included.find(
          (r) => r && r.type === 'job-post' && String(r.id) === String(jpId),
        )
      : null;
    const jpTitle = jp?.attributes?.title || null;

    // Stash the terminal result so the next popup open renders it directly
    // (the popup's maybeResumeMatchApplication reads this url-keyed stash).
    await markMatchAppStashResult(ctx.url, jaId, {
      status,
      jobPostId: jpId,
      title: jpTitle,
      confidence:
        typeof matchCtx.confidence === 'number' ? matchCtx.confidence : null,
      rationale: matchCtx.rationale || '',
    });

    // A hit is worth a single notification (closed-popup result). A miss /
    // failure stays quiet — the application is already tracked; nagging on
    // "no match" is noise.
    if (status === 'done' && jpId) {
      const linkUrl = jobPostUrl(ctx.frontendOrigin, jpId, false);
      notify(
        'Career Caddy — found the job post',
        jpTitle || 'Open the extension to see the matched post.',
        linkUrl,
      );
    }
    return;
  }

  await api.storage.session.set({
    [key]: { ...ctx, pollCount: ctx.pollCount + 1 },
  });
}
