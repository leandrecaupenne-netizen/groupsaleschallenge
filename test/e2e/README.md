# End-to-end browser test

Drives the **real platform in a real browser** (headless Chromium via Puppeteer)
against the **live back-end**, simulating a user: login gate, wrong/right password,
leaderboard load, team squad modal, tab navigation, and session persistence on reload.

This is the only test that proves what an end user actually sees. It complements the
two lightweight tests one level up:

| Test | Covers | Deps | When to run |
|------|--------|------|-------------|
| `../backend-contract.js` | back-end logic, offline (mocked Apps Script) | none | before redeploying the Apps Script |
| `../run-live.sh` | live API over the network | curl | quick daily check / debugging |
| `e2e/run.js` (this) | **full user journey in a browser** | Puppeteer + Chromium | before a launch / after big UI changes |

## Run

```bash
cd test/e2e
npm install        # pulls puppeteer-core + a headless Chromium binary (~150 MB, not committed)
node run.js
```

The runner starts its own static server for the repo, so there's nothing else to launch.
Screenshots land in `test/e2e/shots/` (gitignored). Exit code `0` = all checks passed.

### Options (env vars)

| Var | Effect |
|-----|--------|
| `PASSWORD=…` | override the access code (default `devoteam2026`) |
| `E2E_HEADFUL=1` | show the browser window instead of headless (local debugging) |
| `E2E_INSECURE=1` | ignore TLS certificate errors — **only** needed in a sandbox/CI whose network intercepts HTTPS with a CA the bundled Chromium doesn't trust (see note). Off by default so the test stays strict in normal environments. |

> **TLS note.** Some managed/CI networks proxy HTTPS through a private CA. The system
> trusts it (so `curl` works) but Puppeteer's bundled Chromium does not, and every
> request fails with `net::ERR_CERT_AUTHORITY_INVALID`. If you hit that, re-run with
> `E2E_INSECURE=1`. It does **not** reflect anything about the production app, which
> serves valid public certificates.

## What it asserts

1. The login gate shows and the leaderboard is hidden before auth.
2. A wrong code is rejected and keeps you on the login screen with an error.
3. The correct code logs in and the live leaderboard renders (≥30 teams, ≥300
   people, a top-3 podium, and a real "last updated" timestamp from the sheet).
4. Every ranking tab renders real content (Team Ranking, Players of the Moment,
   Golden Boot, Playmaker, Special Awards, VAR Room, My Position).
5. The **rendered** rankings match the data the app loaded — Team Ranking #1,
   Golden Boot leader and Playmaker leader are re-derived from the in-page payload
   and compared against the DOM (catches client-side ranking regressions).
6. Clicking a team opens its squad modal with member rows.
7. The VAR Room lists yellow-carded players.
8. My Position search for a real player name returns ranking details.
9. The app renders on a mobile viewport (390×844).
10. Dark mode toggles the theme.
11. Reloading keeps the session (no re-login) — `localStorage`-backed.
12. No console errors and no failed network requests during the journey.

Screenshots for each major state (`1-login`, `2-leaderboard`, `tab-*`, `3-team-modal`,
`4-position-search`, `5-mobile`, `6-dark-mode`) are written to `shots/`.
