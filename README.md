# Devoteam World Cup Sales Challenge 2026 — Platform

Live leaderboard for the Devoteam World Cup Sales Challenge 2026 (1 June – 3 July 2026).
Single self-contained HTML file (vanilla JS, no build step) that reads live data from a
Google Sheet via a Google Apps Script web app.

For the full technical brief, see [`CLAUDE.md`](./CLAUDE.md).
For the Google Sheet structure to hand to Jose, see [`SHEET_SPEC.md`](./SHEET_SPEC.md).

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The platform. Single entry point, deployed to Netlify. |
| `apps_script_backend.gs` | Google Apps Script code — the read-only JSON API over the Sheet. |
| `SHEET_SPEC.md` | Spec for the Google Sheet (4 tabs) — give this to Jose. |
| `CLAUDE.md` | Full project brief and architecture. |

---

## Architecture

```
Jose (OneBI) → Google Sheet → Apps Script Web App (JSON API) → index.html (Netlify) → ~400 sales
```

The platform polls the API every 30 seconds (paused when the browser tab is hidden to
save Apps Script quota), with a manual refresh button and a "last updated" timestamp.

---

## Setup (one-time)

### 1. Google Sheet
Create the Sheet exactly as described in [`SHEET_SPEC.md`](./SHEET_SPEC.md) (tabs
`Teams`, `People`, `Config`, and optionally `Special Awards`). Jose owns the data.

### 2. Apps Script back-end
1. In the Sheet: **Extensions → Apps Script**.
2. Paste the contents of [`apps_script_backend.gs`](./apps_script_backend.gs).
3. Save, name the project `Devoteam World Cup API`.
4. **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone, even anonymous** (required, otherwise CORS blocks the fetch).
5. Copy the `/exec` URL.
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

The access password is **not** in the code — it lives in the Sheet's `Config` tab
(`password` key) and is verified server-side by the Apps Script `verify_password` action.

### 4. Host on Netlify
- Quick: drag-and-drop `index.html` onto <https://app.netlify.com/drop>, then rename the
  site (e.g. `devoteam-world-cup-2026.netlify.app`).
- Clean: connect this repo on Netlify (no build command, publish directory `/`); it
  redeploys on every push.

---

## How it works

- **Login** — a password gate (stored server-side in the Sheet). On success a flag is kept
  in `localStorage` (`SESSION_KEY`) so the session persists across reloads.
- **Live data** — `fetchData()` calls `?action=data`; rankings are recomputed client-side.
- **Polling** — every 30s, preserving scroll position and any open team modal; paused when
  the tab is hidden.
- **Resilience** — if a poll fails, the last known data stays on screen and a discreet
  "⚠ Sync failed" badge appears next to the timestamp until the next successful sync.
- **Special Awards** — Licence and Rookie are data-driven; AI Play and Transformative Deal
  show the jury winners from the optional `Special Awards` tab, or a "to be selected"
  placeholder if empty.

To change the password, edit the `password` cell in the Sheet's `Config` tab — no redeploy
needed. To force re-login on a device, clear the `devoteam_wc_session_v1` localStorage key.

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
