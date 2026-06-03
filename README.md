# Devoteam World Cup Sales Challenge 2026 — Platform

[![UX tests](https://github.com/leandrecaupenne-netizen/groupsaleschallenge/actions/workflows/ux-tests.yml/badge.svg)](https://github.com/leandrecaupenne-netizen/groupsaleschallenge/actions/workflows/ux-tests.yml)

Live leaderboard for the Devoteam World Cup Sales Challenge 2026 (1 June – 3 July 2026).
Single self-contained HTML file (vanilla JS, no build step), deployed on Vercel, that reads live data from a
Google Sheet via a Google Apps Script web app.

For the full technical brief, see [`CLAUDE.md`](./CLAUDE.md).
For the Google Sheet structure to hand to Jose, see [`SHEET_SPEC.md`](./SHEET_SPEC.md).

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The platform. Single entry point, deployed to Vercel. |
| `vercel.json` | Vercel config (static site, security headers, HTML revalidation). |
| `apps_script_backend.gs` | Google Apps Script code — the read-only JSON API over the Sheet. |
| `SHEET_SPEC.md` | Spec for the Google Sheet (4 tabs) — give this to Jose. |
| `CLAUDE.md` | Full project brief and architecture. |

---

## Architecture

```
Jose (OneBI) → Google Sheet → Apps Script Web App (JSON API) → index.html (Vercel) → ~400 sales
```

The platform polls the API every 30 seconds (paused when the browser tab is hidden to
save Apps Script quota), with a manual refresh button and a "last updated" timestamp.

---

## Setup (one-time)

### 1. Google Sheet — nothing to build
The backend reads the **existing OneBI-fed sheet** directly: the `Team Ranking` tab
(headers on row 2) and the `Challenge Ranking` tab (headers on row 1). The 3 excluded
teams (Morocco/Serbia/Tunisia) are filtered out automatically. See
[`SHEET_SPEC.md`](./SHEET_SPEC.md) for the exact columns to keep stable. Jose keeps his
OneBI workflow unchanged — just don't rename those tabs or their headers.

### 2. Apps Script back-end
1. In the OneBI sheet: **Extensions → Apps Script**.
2. Paste the contents of [`apps_script_backend.gs`](./apps_script_backend.gs).
   (Optionally edit the `SETTINGS` block: password, period, challenge dates.)
3. Save, name the project `Devoteam World Cup API`.
4. **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (required, otherwise CORS blocks the fetch).
5. Authorize when prompted, then copy the `/exec` URL.
6. Sanity check: open `<URL>?action=ping` in a browser → should return `{"ok":true,...}`.

### 3. Wire the front-end
In [`index.html`](./index.html), find the `CONFIG` block near the top of the main
`<script>` and replace `REPLACE_ME` with your deployed URL:

```javascript
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby.../exec',
  POLL_INTERVAL_MS: 30000,
  SESSION_KEY: 'devoteam_wc_session_v1'
};
```

The access password lives **server-side** (the `SETTINGS.PASSWORD` constant in
`apps_script_backend.gs`, or a `Config` tab if you add one) and is verified by the Apps
Script `verify_password` action — it is never shipped in the front-end.

### 4. Host on Vercel
The GitHub repo is connected to Vercel, so deployment is automatic:
- **Framework preset**: `Other` (static site, no build).
- **Build command**: none. **Output directory**: repo root (`./`).
- `vercel.json` sets the security headers and forces HTML revalidation.
- Every push to `main` triggers a Production deploy; other branches get Preview URLs.
- Default URL looks like `https://<project>.vercel.app` — renamable in
  Project Settings → Domains.

---

## How it works

- **Login** — a password gate verified server-side (Apps Script `SETTINGS.PASSWORD`, or a
  `Config` tab override). On success a flag is kept in `localStorage` (`SESSION_KEY`) so the
  session persists across reloads.
- **Live data** — `fetchData()` calls `?action=data`; rankings are recomputed client-side.
- **Polling** — every 30s, preserving scroll position and any open team modal; paused when
  the tab is hidden.
- **Resilience** — if a poll fails, the last known data stays on screen and a discreet
  "⚠ Sync failed" badge appears next to the timestamp until the next successful sync.
- **Special Awards** — Licence and Rookie are data-driven; AI Play and Transformative Deal
  show the jury winners from the optional `Special Awards` tab, or a "to be selected"
  placeholder if empty.

To change the password, edit `SETTINGS.PASSWORD` in `apps_script_backend.gs` and redeploy
(or add a `password` row in a `Config` tab — no redeploy needed). To force re-login on a
device, clear the `devoteam_wc_session_v1` localStorage key.

---

## Local preview

Open `index.html` directly, or serve it:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

The login and data load require a reachable `APPS_SCRIPT_URL`.

---

## Validation checklist

See [`CLAUDE.md`](./CLAUDE.md) §9 for the full pre-launch checklist (login, polling,
timestamp, modal, mobile responsiveness, HTTPS, etc.).

---

## Tests (headless UX)

Real browser-driven interaction tests (Playwright + Chromium). They mock the
Apps Script login/data, so no network to Google is needed.

```bash
node test/ux-smoke.cjs   # fast: login, tabs, "Find your position" CTA, modals,
                         #       search + fuzzy search, responsive overflow @320/375/768
node test/ux-e2e.cjs     # deep: admin (VAR TIME / Coach Room / VAR review), TV mode,
                         #       card share, clickable ticker, compare, sub-views, dark mode
```
Exit code `0` = all green, `1` = a check failed or a JS error was thrown.

Prereqs: Playwright + Chromium (pre-installed in Claude Code cloud sessions).
Locally: `npm i -D playwright && npx playwright install chromium`.

### Pre-push hook
A committed hook (`.githooks/pre-push`) runs the smoke test before every push and
aborts on regression (it skips gracefully if Playwright isn't installed). Enable it
once per clone:

```bash
git config core.hooksPath .githooks
```
Bypass a single push with `git push --no-verify`.
