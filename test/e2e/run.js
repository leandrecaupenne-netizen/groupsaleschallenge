// End-to-end test — drives the real platform in a real browser against the LIVE
// back-end, simulating a user across the whole app and cross-checking the RENDERED
// rankings against the data the app actually loaded.
//
// Covers: login gate, wrong/right password, leaderboard load, every ranking tab,
// rendered-vs-data ranking cross-checks, team squad modal, VAR room, My Position
// search, mobile viewport, dark mode, session persistence on reload, and a
// console/network error sweep.
//
// Usage:
//   cd test/e2e && npm install && node run.js
//   PASSWORD=… node run.js                 # override access code
//   E2E_INSECURE=1 node run.js             # ignore TLS cert errors (see README)
//   E2E_HEADFUL=1 node run.js              # show the browser window (local debug)
//
// Exit code 0 = all checks passed. Screenshots are written to ./shots/.

const http = require('http');
const fs = require('fs');
const path = require('path');
const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PASSWORD = process.env.PASSWORD || 'devoteam2026';
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

let fails = 0;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const ko = (m) => { console.log(`  \x1b[31m✗\x1b[0m ${m}`); fails++; };
const assert = (cond, m) => cond ? ok(m) : ko(m);
const step = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

// --- Minimal static file server for the repo (serves index.html etc.) --------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split('?')[0]);
      if (rel === '/') rel = '/index.html';
      const file = path.join(REPO_ROOT, path.normalize(rel));
      if (!file.startsWith(REPO_ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); return res.end('not found');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// Tabs and a selector proving each one rendered real content.
const TABS = [
  { id: 'teams',     sel: '.teams-table-row[data-team]' },
  { id: 'spotlight', sel: '.ms-hero, .ms-row' },
  { id: 'golden',    sel: '.ms-hero[data-player], .ms-row[data-player]' },
  { id: 'playmaker', sel: '.ms-hero[data-player], .ms-row[data-player]' },
  { id: 'awards',    sel: '.award-card' },
  { id: 'var',       sel: '.var-row[data-player]' },
  { id: 'position',  sel: '#position-search' },
];

(async () => {
  const srv = await startServer();
  const BASE = `http://127.0.0.1:${srv.address().port}/index.html`;
  console.log(`Serving repo at ${BASE}`);

  const args = [...chromium.args, '--no-sandbox'];
  // Opt-in only: some CI/sandbox networks intercept TLS with a CA the bundled
  // Chromium doesn't trust. Off by default so the test stays strict elsewhere.
  if (process.env.E2E_INSECURE === '1') args.push('--ignore-certificate-errors');

  const browser = await puppeteer.launch({
    args,
    executablePath: await chromium.executablePath(),
    headless: process.env.E2E_HEADFUL === '1' ? false : true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Vercel Speed Insights (`/_vercel/speed-insights/script.js`) is injected by the
  // app but only ever served on Vercel — off-platform it 404s and logs a console
  // error that has nothing to do with the app under test. The headless runners
  // (ux-smoke / ux-e2e) stub `**/_vercel/**`; do the same here so this live test
  // stays strict about REAL errors. Everything else passes through untouched.
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().includes('/_vercel/')) {
      return req.respond({ status: 200, contentType: 'application/javascript', body: '' });
    }
    req.continue();
  });

  // Pre-seed the "already onboarded" flags so the first-visit guided tour (a
  // full-screen overlay that intercepts clicks) never appears during the test.
  // Mirrors what a returning user's browser has; the tour itself is covered by
  // main's ux-smoke suite.
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('devoteam_wc_tour_v1', '1');
      localStorage.setItem('devoteam_wc_intro_seen_v1', '1');
    } catch (e) {}
    // Block the service worker, like the headless runners do (Playwright's
    // `serviceWorkers: 'block'`). The SW precaches the app shell on install and
    // its background fetches surface as console 404s that `page.on('response')`
    // can't see and that have nothing to do with the user journey under test.
    // The SW's own behaviour is out of scope here (covered by the PWA section).
    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.register = () => Promise.reject(new Error('SW blocked for test'));
      }
    } catch (e) {}
  });

  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const failedReqs = [];
  page.on('requestfailed', r => failedReqs.push(`${r.method()} ${r.url()} — ${r.failure() && r.failure().errorText}`));

  try {
    // ---------------------------------------------------------------
    step('1. Load the app — login gate is shown');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#login-pwd', { timeout: 15000 });
    assert(!!(await page.$('#login-btn')), 'login screen rendered (#login-pwd + #login-btn)');
    const teamsBeforeLogin = await page.$$eval('.teams-table-row[data-team]', els => els.length).catch(() => 0);
    assert(teamsBeforeLogin === 0, 'leaderboard is NOT visible before login');
    await page.screenshot({ path: path.join(SHOTS, '1-login.png') });

    // ---------------------------------------------------------------
    step('2. Wrong password is rejected (stays on login, shows error)');
    await page.type('#login-pwd', 'totally-wrong-code');
    await page.click('#login-btn');
    await page.waitForFunction(() => {
      const e = document.querySelector('.login-error');
      return e && e.textContent.trim().length > 0;
    }, { timeout: 25000 }).catch(() => {});
    const errText = await page.$eval('.login-error', e => e.textContent.trim()).catch(() => '');
    assert(!!(await page.$('#login-pwd')), 'still on login screen after wrong code');
    assert(errText.length > 0, `error message shown: "${errText}"`);

    // ---------------------------------------------------------------
    step('3. Correct password logs in and the leaderboard loads (live data)');
    await page.$eval('#login-pwd', el => el.value = '');
    await page.type('#login-pwd', PASSWORD);
    await page.click('#login-btn');
    await page.waitForSelector('.teams-table-row[data-team]', { timeout: 45000 });

    // Ground truth: read the data the app actually loaded (exposed as globals) and
    // compute the expected leaders here, so the cross-checks below compare the
    // RENDERED UI against the SAME payload — no second fetch, always consistent.
    const expect = await page.evaluate(() => {
      const byDesc = (arr, k) => [...arr].sort((a, b) => (b[k] || 0) - (a[k] || 0));
      return {
        teamCount: teams.length,
        peopleCount: people.length,
        topTeam: byDesc(teams, 'avg_ps')[0].country,
        topGolden: byDesc(people, 'ps_nb')[0].name,
        topPlaymaker: byDesc(people, 'opps')[0].name,
        carded: people.filter(p => p.yellow_meetings || p.yellow_gm).length,
        // a real name to search for in My Position
        searchName: byDesc(people, 'opps')[0].name,
      };
    });
    assert(expect.teamCount >= 30, `teams loaded: ${expect.teamCount} (>= 30)`);
    assert(expect.peopleCount >= 300, `people loaded: ${expect.peopleCount} (>= 300)`);
    const podium = await page.$$eval('.podium-card[data-team]', els => els.map(e => e.getAttribute('data-team')));
    assert(podium.length === 3, `podium shows top 3: ${JSON.stringify(podium)}`);
    const lastUpd = await page.$eval('#last-update', e => e.textContent.trim()).catch(() => '(no #last-update)');
    assert(!/loading/i.test(lastUpd), `"last updated" reflects live data: "${lastUpd}"`);
    await page.screenshot({ path: path.join(SHOTS, '2-leaderboard.png') });

    // ---------------------------------------------------------------
    step('3b. Country filter chips show real (cross-platform) flags');
    const chipStats = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('.region-chip')];
      const all = chips.find(c => c.dataset.region === 'all');
      return {
        total: chips.length,
        withFlag: chips.filter(c => c.querySelector('.chip-flag')).length,
        allHasFlag: !!(all && all.querySelector('.chip-flag')),
      };
    });
    assert(chipStats.total > 1 && chipStats.withFlag === chipStats.total - 1 && !chipStats.allHasFlag,
      `country chips carry a flag: ${chipStats.withFlag}/${chipStats.total} (the "All" chip has none)`);
    await (await page.$('.region-chips')).screenshot({ path: path.join(SHOTS, '2b-country-chips.png') }).catch(() => {});

    // ---------------------------------------------------------------
    step('4. Every ranking tab renders real content');
    for (const tb of TABS) {
      await page.click(`.tab-btn[data-tab="${tb.id}"]`);
      const found = await page.waitForSelector(tb.sel, { timeout: 15000 }).then(() => true).catch(() => false);
      const n = await page.$$eval(tb.sel, els => els.length).catch(() => 0);
      assert(found && n > 0, `tab "${tb.id}" rendered (${n} node(s))`);
      await page.screenshot({ path: path.join(SHOTS, `tab-${tb.id}.png`) });
    }

    // ---------------------------------------------------------------
    step('5. Rendered rankings cross-check the loaded data');
    await page.click('.tab-btn[data-tab="teams"]');
    await page.waitForSelector('.teams-table-row[data-team]', { timeout: 15000 });
    const renderedTop = await page.$eval('.teams-table-row[data-team]', el => el.getAttribute('data-team'));
    assert(renderedTop === expect.topTeam, `Team Ranking #1 = "${renderedTop}" (expected "${expect.topTeam}")`);
    await page.click('.tab-btn[data-tab="golden"]');
    await page.waitForSelector('.ms-hero[data-player]', { timeout: 15000 });
    const gHero = await page.$eval('.ms-hero[data-player]', el => el.getAttribute('data-player'));
    assert(gHero === expect.topGolden, `Golden Boot leader = "${gHero}" (expected "${expect.topGolden}")`);
    await page.click('.tab-btn[data-tab="playmaker"]');
    await page.waitForSelector('.ms-hero[data-player]', { timeout: 15000 });
    const pHero = await page.$eval('.ms-hero[data-player]', el => el.getAttribute('data-player'));
    assert(pHero === expect.topPlaymaker, `Playmaker leader = "${pHero}" (expected "${expect.topPlaymaker}")`);

    // ---------------------------------------------------------------
    step('6. Click a team -> squad modal opens with members');
    await page.click('.tab-btn[data-tab="teams"]');
    await page.waitForSelector('.teams-table-row[data-team]', { timeout: 15000 });
    const firstTeam = await page.$eval('.teams-table-row[data-team]', el => el.getAttribute('data-team'));
    await page.click('.teams-table-row[data-team]');
    await page.waitForSelector('.modal-overlay', { timeout: 10000 });
    await page.waitForSelector('.modal-overlay .members-table-row', { timeout: 10000 }).catch(() => {});
    const memberRows = await page.$$eval('.modal-overlay .members-table-row', els => els.length).catch(() => 0);
    assert(memberRows > 0, `squad modal for "${firstTeam}" lists ${memberRows} member(s)`);
    await page.screenshot({ path: path.join(SHOTS, '3-team-modal.png') });
    await page.keyboard.press('Escape');

    // ---------------------------------------------------------------
    step('7. VAR room shows yellow-card players');
    await page.click('.tab-btn[data-tab="var"]');
    await page.waitForSelector('.var-row[data-player]', { timeout: 15000 });
    const varRows = await page.$$eval('.var-row[data-player]', els => els.length);
    assert(varRows > 0, `VAR room lists ${varRows} carded player row(s) (data has ${expect.carded} carded)`);

    // ---------------------------------------------------------------
    step('8. My Position search finds a real player');
    await page.click('.tab-btn[data-tab="position"]');
    await page.waitForSelector('#position-search', { timeout: 15000 });
    await page.type('#position-search', expect.searchName);
    const found = await page.waitForFunction((nm) => {
      const root = document.querySelector('#app');
      return root && root.textContent.includes(nm) &&
        document.querySelectorAll('.ms-mini-badge, .stat, [data-fullrank], .pc-card, .position-details, .ms-hero').length > 0;
    }, { timeout: 10000 }, expect.searchName).then(() => true).catch(() => false);
    assert(found, `search "${expect.searchName}" rendered a result with ranking details`);
    await page.screenshot({ path: path.join(SHOTS, '4-position-search.png') });

    // ---------------------------------------------------------------
    step('9. Mobile viewport renders (390x844)');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.click('.tab-btn[data-tab="teams"]');
    await page.waitForSelector('.teams-table-row[data-team]', { timeout: 15000 });
    const mRows = await page.$$eval('.teams-table-row[data-team]', els => els.length);
    assert(mRows >= 30, `mobile: ${mRows} team rows rendered`);
    await page.screenshot({ path: path.join(SHOTS, '5-mobile.png') });
    await page.setViewport({ width: 1280, height: 900 });

    // ---------------------------------------------------------------
    step('10. Dark mode toggle');
    const themeBtn = await page.$('#theme-btn');
    if (themeBtn) {
      const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      await themeBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      assert(before !== after, `theme toggled: "${before}" -> "${after}"`);
      await page.screenshot({ path: path.join(SHOTS, '6-dark-mode.png') });
    } else {
      ko('theme button (#theme-btn) not found');
    }

    // ---------------------------------------------------------------
    step('11. Session persists across reload (localStorage) — no re-login');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    // Tab-independent signal: the app persists the active tab across reloads, so the
    // Team Ranking table may not be the one rendered. The tab bar / hero always is.
    const cameBackLoggedIn = await page.waitForSelector('#tabs-bar, .hero', { timeout: 45000 })
      .then(() => true).catch(() => false);
    assert(cameBackLoggedIn && !(await page.$('#login-pwd')),
      'reload skipped login and restored the app (session persisted)');

    // ---------------------------------------------------------------
    step('12. No console errors / failed network requests during the journey');
    const realFailed = failedReqs.filter(r => !/favicon/i.test(r));
    assert(consoleErrors.length === 0,
      consoleErrors.length ? `console errors:\n      ${consoleErrors.slice(0, 5).join('\n      ')}` : 'no console errors');
    assert(realFailed.length === 0,
      realFailed.length ? `failed requests:\n      ${realFailed.slice(0, 5).join('\n      ')}` : 'no failed network requests');
  } finally {
    await browser.close();
    srv.close();
  }

  step('Summary');
  console.log(`  screenshots in ${SHOTS}`);
  console.log(`  failures: ${fails}`);
  console.log(fails ? '\n\x1b[31mE2E FAILED\x1b[0m' : '\n\x1b[32mALL E2E CHECKS PASSED\x1b[0m');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('\nE2E crashed:', e); process.exit(2); });
