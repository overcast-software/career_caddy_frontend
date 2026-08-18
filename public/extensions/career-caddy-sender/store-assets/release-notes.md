# Release notes for the store listings

Paste the "What's new" section into the Chrome Web Store / AMO update form.
Everything below is written for users, not for reviewers or maintainers.

The currently published versions are **1.1.0** (Chrome) and **1.1.1**
(Firefox), both from May 2026. This update is a large jump, so the notes
cover the whole gap rather than just the last version.

---

## What's new

**Answer application questions, in your own voice.**
Highlight a question on any application form and the extension drafts an
answer from your Career Caddy profile — your resume, your past answers, your
cover letters — and puts it in the field for you. If you've answered
something similar before, that answer comes straight back, instantly and with
no AI call. Not the one you wanted? Ask again for a different one.

It won't type over anything already in the field, and when the question is a
dropdown or a set of radio buttons rather than a text box, it says so instead
of filling in the wrong thing.

**Quick copy.**
The links and snippets you paste into every application — LinkedIn, GitHub,
portfolio, saved prompts — one click each, without leaving the form.

**A clearer popup.**
Reorganised into Posts and Applications, so capturing a job and working on an
application are no longer the same crowded screen.

**Track applications from the extension.**
Record that you applied, against the right job post, without opening the app.

**Fixes**
- Reconnected to Career Caddy's current address. Older versions pointed at an
  address that no longer exists, and had stopped working entirely.
- Answers survive the popup closing — click into the page and come back, and
  your answer is still there.
- The answer tool no longer disappears on pages where the job post hasn't
  been matched, which is most application forms.

---

## Permissions

**No new permissions.** This update *removes* one host permission that is no
longer needed. Nothing new is requested, so no re-consent is required.

The extension continues to use `activeTab`, which grants access to a page
only when you open the popup on it — it cannot run in the background or on
pages you aren't actively using.

---

## Notes for the reviewer, if asked

- Page content is read on two user actions only: opening the Applications tab
  (to see the question you highlighted) and clicking Send (to capture the
  posting). The duplicate check on popup-open uses the page URL alone.
- The extension writes into a form field only to place an answer the user
  requested, into the field whose question they highlighted, and never over
  existing content.
- Authentication mints a revocable, named API key; the user's password is
  discarded immediately and never stored.
- No third-party services, no telemetry, no cross-site tracking. All network
  traffic goes to the user's own Career Caddy instance.
