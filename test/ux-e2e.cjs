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
    .map((n, i) => ({ name: n[0], team: n[1], tenure: i % 3 === 0 ? '<6 months' : 'Over a year', ps_total: 5e6 - i*3e5, ps_total_gm: i % 5 === 0 ? 0.18 : 0.30, ps_nb: 4e6 - i*3e5, ps_nb_gm: 0.28, licence_gm: i < 5 ? 5e5 - i*5e4 : 0, meetings: i % 4 === 0 ? 3 : 6, opps: 15 - i }));
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

  await browser.close(); server.close();
  console.log('\n===== DEEP UX E2E =====');
  results.forEach(r => console.log(r.line));
  console.log(`\nJS errors: ${errors.length}`); errors.slice(0, 25).forEach(e => console.log('  ' + e));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${failed === 0 && errors.length === 0 ? '✅ ALL GREEN' : `❌ ${failed} failed, ${errors.length} JS error(s)`}`);
  process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(1); });
