/* ============================================================================
 * Deep UX end-to-end test — Devoteam World Cup platform
 * ----------------------------------------------------------------------------
 * Beyond the smoke test: admin views (VAR TIME, Coach Room + KPI deep-dive, VAR
 * review modal), TV/projection mode, card share, clickable ticker, compare modal,
 * Team-Ranking sub-views (Nations/Players), full-ranking expand, dark mode, and a
 * per-tab horizontal-overflow guard on mobile (375px). Catches uncaught JS errors.
 *
 * All clicks are by SELECTOR (re-located at click time) so the app's re-renders
 * never leave us with a stale, detached element handle.
 *
 * Run:  node test/ux-e2e.cjs   (Playwright + Chromium — see ux-smoke.cjs)
 * Exit 0 = all green, 1 = a check failed or a JS error was thrown.
 * ========================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { execSync } = require('child_process');
let PW; try { PW = require('playwright'); } catch { PW = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }

const ROOT = path.resolve(__dirname, '..');
const ADMIN_KEY = 'leandre-refresh-2026';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml' };

function mockData() {
  const teams = [['DENMARK',4],['FR - M CLOUD',5],['ES ENTERPRISE',4],['BELGIUM',3],['PORTUGAL 2',4],['UK',3]]
    .map(([country, members], i) => ({ country, members, total_ps: 9e6 - i*1e6, avg_ps: 2.2e6 - i*2e5, avg_gm: 0.27 - i*0.01, avg_meetings: 6 - i*0.4, avg_opps: 7 - i }));
  const people = [['Claus Thorsager','DENMARK'],['Thomas Vinther','DENMARK'],['Mael Gaudichon','FR - M CLOUD'],['Juan Carlos Nieto','ES ENTERPRISE'],['Leen Verelst','BELGIUM'],['Rui Passinhas','PORTUGAL 2'],['Amelia Giallella','FR - M CLOUD'],['Sara Garcia','ES ENTERPRISE'],['Sean Foster','UK'],['Ines Mejri','FR - M CLOUD'],['Quentin Bernard','FR - M CLOUD'],['Vincent Chevalier','FR - M CLOUD']]
    .map((n, i) => ({ name: n[0], team: n[1], tenure: i % 3 === 0 ? '<6 months' : 'Over a year', ps_total: 5e6 - i*3e5, ps_total_gm: i % 5 === 0 ? 0.18 : 0.30, ps_nb: i === 8 ? 0 : 4e6 - i*3e5, ps_nb_gm: i % 5 === 0 ? 0.18 : 0.28, licence_gm: i < 5 ? 5e5 - i*5e4 : 0, meetings: i % 4 === 0 ? 3 : 6, opps: 15 - i }));
  return { teams, people, updated_at: new Date().toISOString(), period: 'Week 1 of 5', challenge_dates: { start: '2026-06-01', end: '2026-07-03' }, special_awards: {}, warnings: [] };
}

(async () => {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    fs.readFile(path.join(ROOT, p), (e, buf) => { if (e) { res.writeHead(404); return res.end('nf'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(buf); });
  });
  await new Promise(r => server.listen(0, r));
  const BASE = `http://localhost:${server.address().port}/index.html`;
  fs.mkdirSync('/tmp/shots', { recursive: true });

  const results = [], errors = [];
  const log = (n, ok, x = '') => results.push({ ok, line: `${ok ? '✅' : '❌'} ${n}${x ? ' — ' + x : ''}` });
  const browser = await PW.chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });

  async function newPage(opts = {}) {
    const ctx = await browser.newContext(Object.assign({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } }, opts));
    ctx.setDefaultTimeout(6000);
    await ctx.addInitScript(() => { try { localStorage.setItem('devoteam_wc_tour_v1', '1'); localStorage.setItem('devoteam_wc_intro_seen_v1', '1'); } catch (e) {} });
    await ctx.route('**script.google.com**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData()) }));
    // Vercel Speed Insights (/_vercel/…) is served only on Vercel — no-op it off-platform.
    await ctx.route('**/_vercel/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
    // selector helpers — re-locate at action time (resilient to re-renders)
    page.has = async sel => !!(await page.$(sel));
    page.tap = async sel => { try { await page.click(sel, { timeout: 3500 }); return true; } catch { return false; } };
    return { ctx, page };
  }
  async function bootstrap(page, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (await page.has('#login-pwd')) { await page.fill('#login-pwd', 'x'); await page.tap('#login-btn'); }
    await page.waitForSelector('.tab-btn', { timeout: 9000 }).catch(() => {});
    if (await page.has('#tour-ov')) await page.evaluate(() => { const o = document.getElementById('tour-ov'); if (o) o.remove(); });
  }
  const tab = (page, t) => page.tap(`.tab-btn[data-tab="${t}"]`);
  const esc = page => page.keyboard.press('Escape').catch(() => {});

  // ---------- ADMIN coverage ----------
  {
    const { ctx, page } = await newPage();
    await bootstrap(page, `${BASE}?admin=${ADMIN_KEY}`);
    const tabs = await page.$$eval('.tab-btn', els => els.map(e => e.dataset.tab));
    log('Admin unlocks VAR TIME + Coach Room', tabs.includes('vartime') && tabs.includes('coach'), tabs.join(','));

    await tab(page, 'vartime'); await page.waitForTimeout(250);
    log('VAR TIME renders', await page.has('.vt-card, .no-result'));
    if (await page.has('.vt-card-click[data-vtreview]')) {
      await page.tap('.vt-card-click[data-vtreview]'); await page.waitForTimeout(250);
      log('VAR review modal opens', await page.has('#vr-overlay'));
      if (await page.has('[data-vrverdict]')) { await page.tap('[data-vrverdict]'); await page.waitForTimeout(150); log('VAR verdict click (no crash)', true); }
      await esc(page); await page.waitForTimeout(150);
    }
    await page.screenshot({ path: '/tmp/shots/admin-vartime.png' }).catch(() => {});

    await tab(page, 'coach'); await page.waitForTimeout(250);
    log('Coach Room renders', await page.has('.coach-kpi, .coach-row, .no-result'));
    if (await page.has('[data-kpi]')) { await page.tap('[data-kpi]'); await page.waitForTimeout(300);
      log('Coach KPI deep-dive opens', await page.has('#cd-overlay')); await esc(page); await page.waitForTimeout(150); }
    // Avg Gross Margin must be deep-divable too (weighted-GM breakdown).
    log('GM KPI is clickable (deep-dive enabled)', await page.has('[data-kpi="ps_total_gm"]'));
    if (await page.has('[data-kpi="ps_total_gm"]')) { await page.tap('[data-kpi="ps_total_gm"]'); await page.waitForTimeout(300);
      log('GM deep-dive opens', await page.has('#cd-overlay')); await esc(page); await page.waitForTimeout(150); }
    await page.screenshot({ path: '/tmp/shots/admin-coach.png' }).catch(() => {});
    await ctx.close();
  }

  // ---------- PUBLIC journeys ----------
  {
    const { ctx, page } = await newPage();
    await bootstrap(page, BASE);

    await tab(page, 'teams'); await page.waitForTimeout(150);
    for (const v of ['nations', 'players', 'teams']) {
      if (await page.has(`[data-view="${v}"]`)) { await page.tap(`[data-view="${v}"]`); await page.waitForTimeout(200); log(`Team sub-view "${v}"`, await page.has(`[data-view="${v}"].on`)); }
    }

    await tab(page, 'golden'); await page.waitForTimeout(150);
    if (await page.has('[data-fullrank]')) { const before = (await page.$$('.fr-row')).length; await page.tap('[data-fullrank]'); await page.waitForTimeout(200);
      log('Full ranking expands', (await page.$$('.fr-row')).length > before); }

    await tab(page, 'position'); await page.waitForTimeout(150);
    if (await page.has('#position-search')) { await page.fill('#position-search', 'thorsager'); await page.waitForTimeout(250);
      if (await page.has('.pc-share[data-share]')) { await page.tap('.pc-share[data-share]'); await page.waitForTimeout(1500);
        const toast = (await page.textContent('#toast-root').catch(() => '')) || '';
        log('Share card runs (no crash)', true, toast.trim().slice(0, 28)); } }

    if (await page.has('.js-compare')) { await page.tap('.js-compare'); await page.waitForTimeout(300);
      log('Compare modal opens', await page.has('[id^=combo], .compare-modal, #compare-overlay')); await esc(page); await page.waitForTimeout(150); }

    if (await page.has('.ticker-item.ticker-click[data-tplayer]')) {
      // The ticker scrolls continuously, so dispatch the click on the element directly
      // (the real-device tappability is handled by the pointer-down pause in the app).
      const fired = await page.$eval('.ticker-item.ticker-click[data-tplayer]', el => { el.click(); return true; }).catch(() => false);
      await page.waitForTimeout(300);
      log('Ticker headline opens player card', fired && await page.has('#player-overlay')); await esc(page); await page.waitForTimeout(150); }

    if (await page.has('#tv-btn')) { await page.tap('#tv-btn'); await page.waitForTimeout(350);
      log('TV mode opens', await page.has('#tv-overlay'));
      if (await page.has('#tv-next')) { await page.tap('#tv-next'); await page.waitForTimeout(250); log('TV next panel (no crash)', true); }
      if (await page.has('[data-tvplayer]')) { await page.tap('[data-tvplayer]'); await page.waitForTimeout(300); log('TV player card over projection', await page.has('#tv-player-overlay')); await esc(page); await page.waitForTimeout(150); }
      await page.screenshot({ path: '/tmp/shots/tv-mode.png' }).catch(() => {});
      await page.tap('#tv-close'); await page.waitForTimeout(200); log('TV mode exits', !(await page.has('#tv-overlay'))); }

    if (await page.has('#theme-btn')) {
      // Assert the toggle CHANGES the theme — not that it lands on a specific one.
      // The app auto-starts dark in the evening (after 19h), so a one-tap "must be
      // dark" check is time-of-day flaky; comparing before/after is deterministic.
      const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
      await page.tap('#theme-btn'); await page.waitForTimeout(200);
      const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
      log('Dark mode toggles', before !== after, `${before} → ${after}`); }
    await ctx.close();
  }

  // ---------- OPEN IN NEW TAB / shareable deep links ----------
  {
    // Deep links land straight on the right card/squad on a cold load.
    const dl = async (qs, sel, name) => {
      const { ctx, page } = await newPage();
      await bootstrap(page, `${BASE}${qs}`);
      await page.waitForTimeout(300);
      log(name, await page.has(sel));
      await ctx.close();
    };
    await dl('?player=Claus', '#player-overlay', 'Deep link ?player= opens the card on load');
    await dl('?team=DENMARK', '#modal-overlay', 'Deep link ?team= opens the squad on load');
    await dl('?nation=DENMARK', '#nation-overlay', 'Deep link ?nation= opens the nation on load');

    // Ctrl-click a player row opens a NEW TAB (popup) on the ?player= deep link,
    // and does NOT open the in-place modal in the current tab.
    {
      const { ctx, page } = await newPage();
      await bootstrap(page, BASE);
      await tab(page, 'teams');
      if (await page.has('[data-view="players"]')) { await page.tap('[data-view="players"]'); await page.waitForTimeout(200); }
      if (await page.has('.player-row[data-player]')) {
        const [popup] = await Promise.all([
          ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null),
          page.click('.player-row[data-player]', { modifiers: ['Control'] }),
        ]);
        // Real <a> ctrl-click navigates natively, so the popup URL commits a tick later.
        if (popup) { await popup.waitForURL(/\?player=/, { timeout: 4000 }).catch(() => {}); }
        const url = popup ? popup.url() : '';
        log('Ctrl-click opens a new tab on the player deep link', /\?player=/.test(url), url.split('/').pop());
        log('Ctrl-click does NOT open the modal in the current tab', !(await page.has('#player-overlay')));
        if (popup) await popup.close();
        // The right-click "Open in new tab" menu only appears on real <a href> links.
        const rowIsLink = await page.$eval('.player-row[data-player]', el => el.tagName === 'A' && /\?player=/.test(el.getAttribute('href') || ''));
        log('Player rows are real <a> links (enables right-click → open in new tab)', rowIsLink);
        const tabIsLink = await page.$eval('.tab-btn[data-tab]', el => el.tagName === 'A' && (el.getAttribute('href') || '').includes('#'));
        log('Tabs are real <a> links (enables right-click → open in new tab)', tabIsLink);
      }
      await ctx.close();
    }
  }

  // ---------- MOBILE (375px touch): per-tab + modal overflow guard ----------
  {
    const { ctx, page } = await newPage({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await bootstrap(page, BASE);
    for (const t of await page.$$eval('.tab-btn', els => els.map(e => e.dataset.tab))) {
      await tab(page, t); await page.waitForTimeout(150);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      log(`[375] No overflow · ${t}`, o <= 1, `+${o}px`);
    }
    await tab(page, 'golden'); await page.waitForTimeout(150);
    if (await page.has('[data-player]')) { await page.tap('[data-player]'); await page.waitForTimeout(300);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      log('[375] No overflow · player modal open', o <= 1, `+${o}px`); }
    await ctx.close();
  }

  // ---------- DISCIPLINE FLAGS regression (cold + snapshot-hydrate paths) ----------
  // Guards the bug where flags/normalisation lived only in fetchData, so a card painted
  // on first load (or from the instant-paint snapshot) could show a rule-breaker as
  // "playing by the rules". Claus Thorsager (GM 0.18 + 3 mtg/wk) breaks BOTH rules;
  // Thomas Vinther (GM 0.30, 6 mtg/wk) is clean. Asserted on the cold load AND a reload.
  {
    const { ctx, page } = await newPage({ viewport: { width: 390, height: 880 }, hasTouch: true });
    const discFor = async name => {
      await tab(page, 'position'); await page.waitForTimeout(150);
      await page.fill('#position-search', name).catch(() => {});
      await page.waitForTimeout(350);
      return (await page.evaluate(() => (document.querySelector('.pc-discipline') || {}).textContent || '(none)')).trim();
    };
    await bootstrap(page, BASE); // cold path: first fetch, no snapshot
    const coldBreaker = await discFor('Claus Thorsager');
    const coldClean = await discFor('Thomas Vinther');
    log('Cold load: rule-breaker shows a yellow card', coldBreaker.includes('🟨'), coldBreaker);
    log('Cold load: compliant player shows clean', /playing by the rules/i.test(coldClean), coldClean);
    // Reload → instant-paint snapshot hydrate path must derive identical flags.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tab-btn', { timeout: 10000 }).catch(() => {});
    const warmBreaker = await discFor('Claus Thorsager');
    log('Reload (snapshot hydrate): rule-breaker still shows a yellow card', warmBreaker.includes('🟨'), warmBreaker);
    await ctx.close();
  }

  // ---------- Nickname-aliased team consolidates into its real nation ----------
  // "Impulse Rainmakers" is the nickname of the French entity "FR - Digital Impulse".
  // It must fold into France (region FR) — never rank as its own one-team nation — and
  // show the nickname big with the real name underneath.
  {
    const { ctx, page } = await newPage();
    const data = {
      teams: [
        { country: 'Impulse Rainmakers', members: 1, total_ps: 1e6, avg_ps: 1e6, avg_gm: 0.30, avg_meetings: 6, avg_opps: 7 },
        { country: 'FR - M Cloud',       members: 1, total_ps: 2e6, avg_ps: 2e6, avg_gm: 0.30, avg_meetings: 6, avg_opps: 7 },
        { country: 'DENMARK',            members: 1, total_ps: 3e6, avg_ps: 3e6, avg_gm: 0.30, avg_meetings: 6, avg_opps: 7 },
      ],
      people: [
        { name: 'Imp One',   team: 'Impulse Rainmakers', tenure: 'Over a year', ps_total: 1e6, ps_total_gm: 0.30, ps_nb: 8e5, ps_nb_gm: 0.30, licence_gm: 0, meetings: 6, opps: 5 },
        { name: 'Cloud One', team: 'FR - M Cloud',       tenure: 'Over a year', ps_total: 2e6, ps_total_gm: 0.30, ps_nb: 1.5e6, ps_nb_gm: 0.30, licence_gm: 0, meetings: 6, opps: 5 },
        { name: 'Dane One',  team: 'DENMARK',            tenure: 'Over a year', ps_total: 3e6, ps_total_gm: 0.30, ps_nb: 2e6, ps_nb_gm: 0.30, licence_gm: 0, meetings: 6, opps: 5 },
      ],
      updated_at: 'u1', period: 'Week 1', challenge_dates: { start: '2026-06-01', end: '2026-07-03' }, special_awards: {}, warnings: []
    };
    await ctx.route('**script.google.com**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) }));
    await bootstrap(page, BASE);
    await tab(page, 'teams'); await page.waitForTimeout(150);
    if (await page.has('[data-view="nations"]')) { await page.tap('[data-view="nations"]'); await page.waitForTimeout(250); }
    const regions = await page.$$eval('.nation-row[data-nation]', els => els.map(e => e.dataset.nation));
    log('Aliased team folds into France (region FR present)', regions.includes('FR'), regions.join(','));
    log('No standalone "Impulse" nation', !regions.some(r => /IMPULSE/i.test(r)), regions.join(','));
    // Team view: shows the nickname big with the real French entity underneath.
    await page.tap('[data-view="teams"]'); await page.waitForTimeout(200);
    const teamsText = await page.evaluate(() => (document.querySelector('.teams-table, #app') || document.body).innerText);
    log('Team shows nickname + real name', /Impulse RainMakers/i.test(teamsText) && /FR - Digital Impulse/i.test(teamsText));
    await ctx.close();
  }

  // ---------- a11y + no-New-Business surfaces (review fixes) ----------
  {
    const { ctx, page } = await newPage();
    await bootstrap(page, BASE);
    await tab(page, 'teams'); await page.waitForTimeout(120);
    if (await page.has('[data-view="players"]')) { await page.tap('[data-view="players"]'); await page.waitForTimeout(200); }
    // Rows are real <a> now (Enter activates, Space doesn't) — we restore Space for kbd users.
    if (await page.has('.player-row[data-player]')) {
      await page.focus('.player-row[data-player]');
      await page.keyboard.press('Space'); await page.waitForTimeout(250);
      log('Space key opens a player card (a11y)', await page.has('#player-overlay'));
      await esc(page); await page.waitForTimeout(150);
    }
    // A renewals-only rep (ps_nb=0, Sean Foster in the mock) gets a NEUTRAL GM line in My
    // Position — not a green ✅ and not a red 🟨, and not a silently-missing line.
    await tab(page, 'position'); await page.waitForTimeout(150);
    if (await page.has('#position-search')) {
      await page.fill('#position-search', 'Sean Foster'); await page.waitForTimeout(300);
      log('No-New-Business rep gets a neutral GM line in My Position', await page.has('.status-neutral'));
    }
    await ctx.close();
  }

  // ---------- XSS regression: sheet data is human-edited, so it must be escaped ----------
  // A name/team/nickname/period containing HTML must never execute or inject elements.
  {
    const { ctx, page } = await newPage({ viewport: { width: 390, height: 880 }, hasTouch: true });
    // A probe that, if a sink failed to escape, would create a real element we can
    // detect — and a <script> that would set a global. No `src`, so no benign
    // resource fetch noise; we assert purely on injection + execution.
    // Leading `"` and `>` also probe attribute breakout (e.g. region → data-* / <option value>).
    const evil = '"></span><b class="xss-probe">BAD</b><script>window.__XSS=1<\/script>';
    const evilData = {
      teams: [{ country: `ITALY${evil}`, nickname: `Nick${evil}`, members: 4, total_ps: 9e6, avg_ps: 2.4e6, avg_gm: 0.2, avg_meetings: 6, avg_opps: 8 },
              { country: 'DENMARK', members: 4, total_ps: 8e6, avg_ps: 2.2e6, avg_gm: 0.2, avg_meetings: 6, avg_opps: 7 }],
      people: [{ name: `Evil${evil}`, team: `ITALY${evil}`, tenure: `<6 months`, ps_total: 5e6, ps_total_gm: 0.18, ps_nb: 4e6, ps_nb_gm: 0.2, licence_gm: 5e5, meetings: 3, opps: 40, is_rookie: true },
               { name: 'Bob Normal', team: 'DENMARK', tenure: 'Over a year', ps_total: 4e6, ps_total_gm: 0.31, ps_nb: 3e6, ps_nb_gm: 0.3, licence_gm: 0, meetings: 6, opps: 30, is_rookie: false }],
      updated_at: 'u1', period: `Week 1 ${evil}`, challenge_dates: { start: '2026-06-01', end: '2026-07-03' }, special_awards: { ai_play_winner: { name: `AI${evil}`, team: 'ITALY', description: `d${evil}` } }, warnings: []
    };
    // Last-registered route wins, so this overrides newPage's default mock with evil data.
    await ctx.route('**script.google.com**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(evilData) }));
    // Admin URL so the Coach Room / VAR Time region selects + data-cd-region rows render
    // (those interpolate region = a raw team name into HTML attributes).
    await bootstrap(page, BASE + '?admin=' + ADMIN_KEY);
    for (const t of await page.$$eval('.tab-btn', els => els.map(e => e.dataset.tab))) { await tab(page, t); await page.waitForTimeout(80); }
    // Also exercise a team modal + player card (more data sinks).
    await tab(page, 'teams'); await page.waitForTimeout(120);
    if (await page.has('[data-team]')) { await page.tap('[data-team]'); await page.waitForTimeout(200); await esc(page); await page.waitForTimeout(120); }
    const fired = await page.evaluate(() => window.__XSS || 0);
    const injected = await page.evaluate(() => document.querySelectorAll('.xss-probe').length);
    log('XSS: malicious sheet data does not execute', fired === 0, `__XSS=${fired}`);
    log('XSS: malicious sheet data injects no elements', injected === 0, `probes=${injected}`);
    await ctx.close();
  }

  // ---------- localStorage blocked (Safari Private Mode / locked-down browsers) ----------
  // Storage throwing on every call must NOT trap the user on the login screen: an
  // in-memory fallback keeps the session + access code alive for the page session.
  {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 880 }, hasTouch: true });
    // Block storage BEFORE any app/script runs (first init script wins the timing).
    await ctx.addInitScript(() => {
      const block = () => { throw new DOMException('Storage disabled', 'SecurityError'); };
      try { Object.defineProperty(window, 'localStorage', { configurable: true, get() { return { getItem: block, setItem: block, removeItem: block, clear: block, key: block, length: 0 }; } }); } catch (e) {}
    });
    await ctx.route('**script.google.com**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData()) }));
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    if (await page.$('#login-pwd')) { await page.fill('#login-pwd', 'test'); await page.click('#login-btn'); }
    await page.waitForSelector('.tab-btn', { timeout: 10000 }).catch(() => {});
    const ok = await page.evaluate(() => !!document.querySelector('.tab-btn') && !document.querySelector('#login-pwd'));
    log('localStorage blocked: login still reaches the leaderboard', ok);
    await ctx.close();
  }

  // ---------- Tie-aware (competition) ranks on player boards + card ----------
  // Players on the same figure must share a rank (e.g. three reps on 7 opportunities
  // are all #2), and the player card / My Position must agree with the board.
  {
    const tieData = {
      teams: [{ country: 'ITALY', members: 4, total_ps: 1000, avg_ps: 250, avg_gm: 0.2, avg_meetings: 6, avg_opps: 8 }],
      people: [
        { name: 'Ann Alpha', team: 'ITALY', tenure: 'Over a year', ps_total: 400, ps_total_gm: 0.3, ps_nb: 300, ps_nb_gm: 0.3, licence_gm: 0, meetings: 6, opps: 10, is_rookie: false },
        { name: 'Bea Bravo', team: 'ITALY', tenure: 'Over a year', ps_total: 300, ps_total_gm: 0.3, ps_nb: 250, ps_nb_gm: 0.3, licence_gm: 0, meetings: 6, opps: 7, is_rookie: false },
        { name: 'Cy Charlie', team: 'ITALY', tenure: 'Over a year', ps_total: 250, ps_total_gm: 0.3, ps_nb: 240, ps_nb_gm: 0.3, licence_gm: 0, meetings: 6, opps: 7, is_rookie: false },
        { name: 'Dan Delta', team: 'ITALY', tenure: 'Over a year', ps_total: 200, ps_total_gm: 0.3, ps_nb: 230, ps_nb_gm: 0.3, licence_gm: 0, meetings: 6, opps: 7, is_rookie: false }
      ],
      updated_at: 'tie1', period: 'Week 2 of 5', challenge_dates: { start: '2026-06-01', end: '2026-07-03' }, special_awards: {}, warnings: []
    };
    const { ctx, page } = await newPage({ viewport: { width: 1000, height: 900 } });
    await ctx.route('**script.google.com**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tieData) }));
    await bootstrap(page, BASE);
    await tab(page, 'playmaker'); await page.waitForTimeout(200);
    const board = await page.evaluate(() => {
      const out = {};
      const grab = (rankSel, scope) => { const nm = (scope.textContent.match(/Ann|Bea|Cy|Dan/) || [])[0]; const rk = (scope.querySelector(rankSel) || {}).textContent; if (nm && rk) out[nm] = rk.trim(); };
      const hero = document.querySelector('.ms-hero'); if (hero) grab('.ms-hero-rank', hero);
      document.querySelectorAll('.ms-row').forEach(r => grab('.ms-rank', r));
      return out;
    });
    log('Tied playmakers share a rank on the board', board.Bea === '#2' && board.Cy === '#2' && board.Dan === '#2', JSON.stringify(board));
    // Photo-finish banner must never advertise a 0-gap tie ("only 0 opps between …").
    const raceTxt = await page.evaluate(() => { const b = document.querySelector('.race-strip'); return b ? b.textContent : ''; });
    log('Photo finish never shows a 0-gap tie', !/\b0 opps?\b/.test(raceTxt), raceTxt.replace(/\s+/g, ' ').trim().slice(0, 50));
    await tab(page, 'position'); await page.waitForTimeout(150);
    await page.fill('#position-search', 'Cy Charlie').catch(() => {});
    await page.waitForTimeout(300);
    const cardRank = await page.evaluate(() => { const t = document.querySelector('[data-goto="playmaker"]'); const m = t && t.textContent.match(/#(\d+)/); return m ? '#' + m[1] : null; });
    log('Player card playmaker rank matches the board (tie-aware)', cardRank === '#2', `card=${cardRank}`);
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log('\n===== DEEP UX E2E =====');
  results.forEach(r => console.log(r.line));
  console.log(`\nJS errors: ${errors.length}`); errors.slice(0, 25).forEach(e => console.log('  ' + e));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${failed === 0 && errors.length === 0 ? '✅ ALL GREEN' : `❌ ${failed} failed, ${errors.length} JS error(s)`}`);
  process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(1); });
