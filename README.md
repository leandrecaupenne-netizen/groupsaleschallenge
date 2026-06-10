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

The platform polls the API every ~2 minutes (jittered; paused when the browser tab is
hidden to save Apps Script quota), with an admin-only manual refresh button and a
"last updated" timestamp.

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
`apps_script_backend.gs`, or a `Config` tab if you add one). The front-end never ships it:
it POSTs the entered code with the data request (`POST {action:"data", password}`), and a
correct code is what returns the payload — a wrong one returns `{"error":"unauthorized"}`.
The code is checked server-side only and is never sent back to the client. (Data is never
served over GET, so the access code can't leak into a URL/history/logs.)

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
- **Live data** — `fetchData()` POSTs `{action:"data", password}`; rankings are recomputed
  client-side. The response also carries a `warnings` array surfacing any sheet/header
  mismatch the back-end hit while mapping.
- **Polling** — every ~2 min (jittered, since the sheet only changes ~weekly), preserving
  scroll position and any open team modal; paused when the tab is hidden.
- **Resilience** — if a poll fails, the last known data stays on screen and a discreet
  "⚠ Sync failed" badge appears next to the timestamp until the next successful sync.
- **Special Awards** — Licence and Rookie are data-driven; AI Play and Transformative Deal
  show the jury winners from the optional `Special Awards` tab, or a "to be selected"
  placeholder if empty.

To change the password, edit `SETTINGS.PASSWORD` in `apps_script_backend.gs` and redeploy
(or add a `password` row in a `Config` tab — no redeploy needed). To force re-login on a
device, clear the `devoteam_wc_session_v1` localStorage key.

---

## Mobile & touch

The platform is used at least as much on phones as on desktop, so two rules apply to every
surface (podium, team/nation rankings, Golden Boot, Playmaker, Special Awards, My Position,
team/player modals, TV mode):

1. **Nothing important is hover-only.** Touch devices have no hover, so any information a
   tooltip would reveal must also be reachable by a tap.
   - The per-group **yellow-card tally `🟨 (N)`** (podium, team ranking, nation ranking):
     hovering shows the split on desktop; **tapping the badge** opens a small popover with
     `🏃 X Low Activity` (< 5 meetings/wk) · `🥅 Y Low Margin` (NB GM < 25%). One delegated,
     capture-phase handler shows the popover and stops the tap from also opening the squad
     modal the badge sits inside; tapping elsewhere (or a real scroll) closes it.
   - A **single player's** yellow card (in any list): the `🟨` is itself tappable —
     it reveals that one card's reason (`🏃 Low Activity` or `🥅 Low Margin`, with the
     measured value) without opening the player card it sits inside. The player card's
     `.pc-discipline` badge is also tap-to-reveal.
   - Small bracketed counts (e.g. the tally `🟨 ( N )`) keep a space inside the brackets
     so the digits stay legible at small sizes (TV, dense rows).
   - On the **TV / projection** surface there is no pointer, so the tally is a glanceable
     `🟨 ( N )` indicator only — by design.

2. **Nothing is clipped inside a card.** Cards use `overflow:hidden`, so content that's
   wider than its box gets *silently cut off* (this is invisible to a document-level
   overflow check). The fix pattern is to let tight meta rows **wrap** (`flex-wrap`) rather
   than overflow — e.g. the podium card's `👥 / 📊 / 🟨` meta row wraps the tally to a new
   line on narrow screens instead of clipping it.

Both rules are regression-guarded by the UX tests below (`No content clipped inside a box on
mobile`, and the tap-tally / tap-outside-closes assertions). The only boxes intentionally
wider than their frame — and therefore allowlisted — are the scrolling ticker marquee,
circular cover-cropped avatars, and the hero's decorative background.

---

## Security model

This is a **light internal gate, not real access control** — size the trust accordingly:

- The access code is verified server-side (never shipped in the bundle), but it is a
  **single shared code** sent with every data request. Anyone with the link + code (or who
  gets it from another participant) can view the leaderboard. Treat the data as
  "internal, low-sensitivity" — which it is (names + relative sales standings).
- **Admin mode** (`?admin=…`) only unlocks UI affordances (manual refresh, VAR TIME, Coach
  Room) on that device via `localStorage`. The admin key ships in the client bundle, so
  admin mode is **self-grantable by anyone who reads the JS** — it gates convenience, not
  data. VAR verdicts entered in admin mode are local-only and never written back.
- There is **no per-user authentication**. If that's ever required, the path is Google SSO
  restricted to `@devoteam.com` (see [`CLAUDE.md`](./CLAUDE.md) §10), not the shared code.

---

## Local preview

Open `index.html` directly, or serve it:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

The login and data load require a reachable `APPS_SCRIPT_URL`.

---

## Live back-end test

`test/run-live.sh` smoke-tests the deployed Apps Script the way `index.html` does —
ping connectivity, wrong-password rejection, and an authenticated data pull with
shape/count/integrity checks (team count, people count, excluded teams filtered,
referential integrity).

```bash
bash test/run-live.sh
# or point it elsewhere:
APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec PASSWORD=… bash test/run-live.sh
```

Exit code `0` = all checks passed. It flags people on teams missing from `Team Ranking`
as a warning (not a failure), since the platform still ranks them.

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
                         #       search + fuzzy search, responsive overflow @320/375/768,
                         #       and no content clipped inside a card on mobile (all tabs)
node test/ux-e2e.cjs     # deep: admin (VAR TIME / Coach Room / VAR review), TV mode,
                         #       card share, clickable ticker, compare, sub-views, dark mode,
                         #       tap-the-tally split popover (mobile, no hover)
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
