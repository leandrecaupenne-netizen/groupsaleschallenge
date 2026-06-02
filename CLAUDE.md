# CLAUDE.md — Devoteam World Cup Sales Challenge 2026

Guide for AI assistants working in this repository. Read this before making changes.
It describes **what the codebase actually is today** (not a future plan), how it is
structured, the conventions to follow, and the gotchas that will bite you.

> The platform is **built and deployed**. This is no longer a "turn the mockup into an
> app" project — that work is done. Most tasks now are incremental: new views, polish,
> data-mapping tweaks, more player photos, bug fixes. Keep the single-file, no-build,
> vanilla-JS spirit intact.

---

## 1. What this is

A **live leaderboard** for the *Devoteam World Cup Sales Challenge 2026* — a Group-wide
sales contest themed around the FIFA World Cup, running **1 June → 3 July 2026** (5 weeks),
with the award ceremony in Paris on 9 July at Victoria Paris (l'Arc).

- **Scope**: 35 teams (32 active — Morocco / Serbia / Tunisia excluded), ~377 salespeople.
- **Audience**: ~400 internal Devoteam sales people, on web + mobile (installable PWA).
- **Data source**: Jose (Group Sales) maintains a OneBI-fed Google Sheet. The platform
  reads it **read-only** through a Google Apps Script web app that returns JSON.

**Football wording everywhere** — Golden Boot, Playmaker, Yellow/Red Card, VAR, World Cup
Winner. UI copy is **English only** (international common language). Team names are
UPPERCASE as in the Sheet (LUXEMBOURG, DENMARK, FR - M Cloud, …).

**Stakeholders**: Léandre CAUPENNE (project/platform owner), Jose (data owner, fills the
Sheet), Aline (project meetings), Alexis (co-animates post-match commentary).

---

## 2. Architecture

```
Jose (OneBI)  →  Google Sheet  →  Apps Script Web App (JSON API)  →  index.html (Vercel)  →  ~400 sales
                 Team Ranking      apps_script_backend.gs             single-file PWA
                 Challenge Ranking  password-gated, 30s cache         polls every ~2 min
```

- **No framework, no build step.** HTML + CSS + vanilla JS, everything inline in
  `index.html`. The only external runtime call is `fetch()` to the Apps Script URL.
- The **password lives server-side** (`SETTINGS.PASSWORD` in the `.gs`, or a `Config`
  tab). It is never shipped in the front-end. `?action=data` returns nothing without it.
- The front-end **recomputes all rankings client-side** from the raw `teams` / `people`
  arrays the API returns — the API does minimal derivation (rookie / yellow-card flags).

---

## 3. Repository layout

```
groupsaleschallenge/
├── CLAUDE.md                  ← this file
├── README.md                  ← human setup/usage doc (Vercel + Apps Script wiring)
├── SHEET_SPEC.md              ← exact Sheet structure to hand to Jose (source of truth)
├── index.html                 ← THE APP. ~6.8k lines, ~445 KB, single file, no deps
├── apps_script_backend.gs     ← the deployed Google Apps Script JSON API
├── vercel.json                ← static host config: security headers, HTML revalidation
├── manifest.webmanifest       ← PWA manifest (installable, standalone, portrait)
├── service-worker.js          ← network-first HTML, cache-first assets; never caches the API
├── icon-192.png / icon-512.png / icon-maskable-512.png  ← PWA icons
└── cards/                     ← 355 Gemini-style player portraits, <slug>.png
```

There is **no `package.json`, no CI, no node_modules, no .github/**. Don't add a build
pipeline unless explicitly asked — it would break the "just push static files" model.

---

## 4. `index.html` internals (the part you'll edit most)

One `<style>` block and one `<script>` block. Key landmarks (line numbers drift — search
by name):

### 4.1 Configuration — `CONFIG` (top of the script)
```javascript
const CONFIG = {
  APPS_SCRIPT_URL: '…/exec',     // deployed Apps Script endpoint
  POLL_INTERVAL_MS: 120000,      // 2 min base, jittered ±25% (data changes ~weekly)
  IDLE_TIMEOUT_MS: 15*60*1000,   // pause polling after 15 min idle
  SESSION_KEY: 'devoteam_wc_session_v1',  // logged-in flag
  PWD_KEY:     'devoteam_wc_pwd_v1',      // stored access code, resent with each data fetch
  ADMIN_KEY:   'leandre-refresh-2026',    // unlock admin via ?admin=<key> (off via ?admin=off)
  ADMIN_FLAG:  'devoteam_wc_admin_v1',
  RANKS_KEY / SNAPSHOT_KEY / WEEKSNAP_KEY / WEEKDIGEST_KEY  // localStorage caches
};
```

### 4.2 Data flow
- `fetchData()` → POST to the Apps Script with the stored password → fills the module-level
  mutables `DATA, teams, people, updated_at, period, challenge_dates, specialAwards`.
- `computeRankings()` (re)builds the sorted arrays: `sortedTeams` (by `avg_ps`),
  `sortedGoldenBoot` (by `ps_nb`), `sortedPlaymaker` (by `opps`), `sortedPSTotal`,
  `sortedLicence`, `sortedRookies`.
- `cacheSnapshot()` / `hydrateFromSnapshot()` keep the last payload in localStorage for an
  **instant paint on return** (ignored if older than `SNAPSHOT_MAX_AGE_MS` = 6h).

### 4.3 Render model — **innerHTML + rebind**
`render()` switches on `currentTab`, builds an HTML string from `render*()` functions, sets
`#app`'s `innerHTML`, then **re-attaches all event listeners** (clicks delegate to
`[data-player]`, `[data-team]`, `[data-fullrank]`, buttons, etc.). There is **no virtual
DOM and no reactive framework** — after any state change you call `render()` again.

When re-rendering during a poll, **scroll position and open modals/overlays are
preserved** (`window.scrollY` saved/restored; `openTeamModal` / overlay state kept). Don't
break this — a flash or scroll jump during the 2-min poll is a regression.

### 4.4 Tabs / views (`TABS`, `render()`)
Public tabs: `teams`, `spotlight` (Players of the Moment), `golden` (Golden Boot),
`playmaker`, `awards` (Special Awards), `var` (VAR Room), `position` (My Position).
**Admin-only** tabs appended when admin mode is on: `vartime` (VAR TIME — Friday review)
and `coach` (Coach Room — totals/objectives + contributor breakdown). Non-admins falling
into an admin tab fall back to the team ranking.

### 4.5 Player photos — slug convention
Portraits live in `cards/<slug>.png`. `nameSlug(name)` lowercases, transliterates accents
(via the `ACCENTS` map), and replaces non-alphanumerics with `-` ("Louis MASSON" →
`louis-masson`). The set of available slugs is the hardcoded `CARD_PHOTOS` Set.
`photoFor(name)` returns the URL or `''`; `avatarInner(name)` renders the `<img>` with an
`onerror` fallback to initials. **To add photos: drop the PNGs in `cards/` AND add the
slugs to `CARD_PHOTOS`.** A photo present on disk but absent from the Set won't be used.

### 4.6 Theme, TV mode, admin
- **Dark mode**: `:root[data-theme="dark"]` overrides CSS vars; `toggleTheme()` /
  `applyTheme()`; respects `prefers-color-scheme` on first load. Persisted in localStorage.
- **TV / projection mode** (`enterTV()` / `toggleTV()`): full-screen, auto-rotating panels
  for projecting on an office screen; hides chrome via `setChromeVisible(false)`.
- **Admin mode**: `?admin=<ADMIN_KEY>` unlocks the manual refresh button + admin tabs;
  `?admin=off` clears it. Gated by `isAdmin()` / `applyAdminVisibility()`.

### 4.7 Other notable features (all client-side)
Spotlights & auto-generated commentary; VAR yellow-card logic (low meetings < 5, low GM
< 25%); confetti on new #1; ▲▼ movement badges vs last visit; weekly "what changed"
digest; canvas-rendered **downloadable player cards** and **standings image**; player
**compare**; name search combo; offline-tolerant sync badge ("⚠ Sync failed").

### 4.8 Resilience helpers
localStorage is wrapped in `safeGet/safeSet/safeRemove` (private-browsing safe). HTML is
escaped with `escapeHtml` before interpolation of any user/data string — **keep using it**
for anything coming from the Sheet.

---

## 5. The Apps Script backend (`apps_script_backend.gs`)

This is the **deployed, authoritative** backend (the code blocks in older revisions of this
brief were earlier drafts; this `.gs` supersedes them).

- Reads the **existing OneBI tabs directly** — `Team Ranking` (headers on row **2**) and
  `Challenge Ranking` (headers on row **1**). **No `Teams`/`People` tabs to create.**
- Column matching is **tolerant**: `normHeader()` lowercases + collapses whitespace/newlines,
  so headers map by name regardless of case/spacing. Mappings are `TEAM_MAP` / `PEOPLE_MAP`.
- `toNumber()` coerces numerics, treating `''`, `#DIV/0!`, `#N/A`, `#REF!` as `0` and
  stripping `%`, nbsp, thousands commas.
- Excludes `MOROCCO / SERBIA / TUNISIA` (case-insensitive) → 32 teams.
- Derives per-person `is_rookie`, `yellow_meetings`, `yellow_gm`.
- **Auth**: `?action=data` requires the password (sent via POST body, or `?pw=` for manual
  checks). `verify_password` POST action backs the login screen. Password resolves from a
  `Config` tab `password` row if present, else `SETTINGS.PASSWORD`.
- **Caching**: payload cached ~30s in `CacheService` (chunked, since values cap ~100 KB);
  all cache ops are best-effort and never break the response. `?fresh=1` / `?nocache=1`
  bypasses the cache.
- Editable knobs are in the `SETTINGS` block at the top: `PASSWORD`, `PERIOD`,
  `CHALLENGE_START/END`, `EXCLUDED_TEAMS`, tab names + header rows.

Changing `SETTINGS` (e.g. the password) requires **re-pasting + re-deploying** the script —
unless overridden via a `Config` tab (no redeploy). Deployment steps are in `README.md`.

---

## 6. Data contract (field names the front-end relies on)

`team` objects: `country, members, total_ps, avg_ps, avg_gm, avg_meetings, avg_opps`.
`person` objects: `name, team, tenure, ps_total, ps_total_gm, ps_nb, ps_nb_gm, licence_gm,
meetings, opps` + derived `is_rookie, yellow_meetings, yellow_gm`.
Top-level payload also has: `updated_at, period, challenge_dates {start,end}, special_awards`.

A person's `team` must exactly match a `country` or they won't appear in that team's
drilldown. GM percentages are **decimals** (0.27 = 27%). See `SHEET_SPEC.md` for the full,
authoritative column spec to give Jose. If you rename a field, update both the `.gs`
mapping and every consumer in `index.html`.

---

## 7. Development workflow

### Branch & deploy
- **Work on a feature branch**, never commit straight to `main`.
- The repo is connected to **Vercel**: push to `main` → Production deploy; any other
  branch → a Preview URL. Static site, **no build** (preset `Other`, empty build command,
  output `./`).
- Commit only when asked; write clear messages. **Don't open a PR unless asked.**

### Local preview
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
Login + data require a reachable `APPS_SCRIPT_URL`. For pure UI work you can temporarily
stub `fetchData()` or rely on the localStorage snapshot, but never commit a stub.

### Editing conventions
- Keep everything **inline in `index.html`** — no new JS/CSS files, no CDN links, no
  dependencies. The single-file portability is a hard product constraint.
- Match the surrounding style: template-literal HTML builders named `render*()`, terse
  vanilla JS, CSS custom properties from `:root` (`--navy`, `--usa-red`, `--gold`,
  `--cream`, `--paper`, `--ink`, `--line`, …). Don't hardcode colors that have a var.
- After any state change, re-`render()` and re-bind; preserve scroll + open overlays.
- Escape Sheet-sourced strings with `escapeHtml`; use `safe*` for localStorage.
- Football wording, English copy, UPPERCASE team names. New user-facing strings go in the
  `I18N.en` map where practical.
- Test **dark mode**, **mobile width**, and a **poll re-render** for any visual change.

---

## 8. Pre-launch / regression checklist

- [ ] `?action=ping` on the Apps Script URL returns `{ok:true,…}`.
- [ ] Apps Script deployed with access **Anyone** (else CORS blocks the fetch).
- [ ] `CONFIG.APPS_SCRIPT_URL` points at the live `/exec`.
- [ ] Login: correct code in → access; wrong code → error; session persists across reload.
- [ ] `Last updated` shows the Sheet's `updated_at`; manual refresh (admin) spins & works.
- [ ] Poll (~2 min) re-renders **without** flash or scroll jump; open modal stays open.
- [ ] Team modal lists members sorted by contribution; My Position search finds real names.
- [ ] Responsive on iPhone + Android; dark mode readable; PWA installs.
- [ ] Player photos resolve for known names, fall back to initials otherwise.

---

## 9. Troubleshooting

- **"Failed to load data"** — wrong/undeployed `APPS_SCRIPT_URL`, or access not set to
  *Anyone* (CORS), or a 403/404 (check the Network tab).
- **Login refused with correct password** — stray space in the `Config` `password` cell,
  or a numeric value (backend compares with `String()`); confirm `SETTINGS.PASSWORD`.
- **Poll causes flash / scroll jump** — `window.scrollY` not restored, or `openTeamModal` /
  overlay state not preserved across `render()`.
- **Data not updating** — Jose didn't refresh `last_update` (timestamp won't move even if
  numbers change); or browser cache (hard-refresh); or the 30s server cache (use `?fresh=1`).
- **Apps Script quota** — free tier ~20k req/day; that's why polling is 2 min + jitter +
  idle-pause + a 30s server cache. Don't lower `POLL_INTERVAL_MS` without thinking about
  ~400 concurrent users.
- **A player has no photo** — slug missing from `CARD_PHOTOS`, or filename doesn't match
  `nameSlug(name)` (accents/spaces).

---

## 10. Future ideas (out of scope unless asked)

Server-Sent Events / push instead of polling; Google SSO restricted to `@devoteam.com`;
historical snapshots + trend charts; Slack webhook on new #1 / yellow card; richer count-up
animations. Keep the no-build, single-file philosophy in mind for any of these.

---

## 11. Contacts & access

- **Léandre CAUPENNE** (owner): leandre.caupenne@devoteam.com
- **Jose** (data owner, Group Sales): TBD · **Devoteam IT** (custom DNS): TBD
- **Apps Script URL**: see `CONFIG.APPS_SCRIPT_URL` in `index.html` (kept in sync there).
- **Vercel preview**: https://groupsaleschallenge-git-clau-a93676-leandre-caupenne-s-projects.vercel.app/
- **Access password**: `SETTINGS.PASSWORD` in `apps_script_backend.gs` (currently `devoteam2026`).
- **Admin unlock**: open the site with `?admin=leandre-refresh-2026`.
- **Repo**: `leandrecaupenne-netizen/groupsaleschallenge`

---

## Appendix — legacy spec/code notice

Earlier revisions of this brief contained a "build the app from the mockup" roadmap, an
idealized `Teams`/`People` Sheet schema, and a first-draft Apps Script. Those are
**superseded**: the live backend reads the real OneBI tabs (`Team Ranking` /
`Challenge Ranking`) per `apps_script_backend.gs`, and the authoritative Sheet spec is
`SHEET_SPEC.md`. When in doubt, trust the deployed `.gs`, `SHEET_SPEC.md`, and the current
`index.html` over any prose in this document.
