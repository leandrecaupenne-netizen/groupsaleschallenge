/* ============================================================================
 * UX interaction smoke test — Devoteam World Cup platform
 * ----------------------------------------------------------------------------
 * Drives the REAL app in a headless browser: mocks the Apps Script login/data
 * (no network to Google needed), dismisses the onboarding tour, then clicks
 * through every tab, the "Find your position" CTA, player/team modals, search +
 * fuzzy search, TV/dark-mode buttons — asserting expected behaviour and catching
 * uncaught JS errors and horizontal overflow at mobile widths.
 *
 * Run:  node test/ux-smoke.cjs
 * Prereqs: Playwright + Chromium (pre-installed in Claude Code cloud sessions;
 *          locally: `npm i -D playwright && npx playwright install chromium`).
 * Exit code 0 = all green, 1 = a check failed or a JS error was thrown.
 * ========================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { execSync } = require('child_process');

// Resolve Playwright whether it's a local dep or the global install.
let PW;
try { PW = require('playwright'); }
catch {
  try { PW = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
  catch { console.error('❌ Playwright not found. Install: npm i -D playwright && npx playwright install chromium'); process.exit(2); }
}

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp',
  '.png':'image/png', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml' };

// Mock dataset in the Apps Script JSON shape (varied: yellow cards, rookies, licence).
function mockData() {
  const teams = [['DENMARK',4],['FR - M CLOUD',5],['ES ENTERPRISE',4],['BELGIUM',3],['PORTUGAL 2',4],['UK',3]]
    .map(([country, members], i) => ({ country, members, total_ps: 9e6 - i*1e6, avg_ps: 2.2e6 - i*2e5,
      avg_gm: 0.27 - i*0.01, avg_meetings: 6 - i*0.4, avg_opps: 7 - i }));
  const people = [['Claus Thorsager','DENMARK'],['Thomas Vinther','DENMARK'],['Mael Gaudichon','FR - M CLOUD'],
    ['Juan Carlos Nieto','ES ENTERPRISE'],['Leen Verelst','BELGIUM'],['Rui Passinhas','PORTUGAL 2'],
    ['Amelia Giallella','FR - M CLOUD'],['Sara Garcia','ES ENTERPRISE'],['Sean Foster','UK'],['Ines Mejri','FR - M CLOUD']]
    .map((n, i) => ({ name: n[0], team: n[1], tenure: i % 3 === 0 ? '<6 months' : 'Over a year',
      ps_total: 5e6 - i*3e5, ps_total_gm: i === 2 ? 0.18 : 0.30, ps_nb: 4e6 - i*3e5, ps_nb_gm: 0.28,
      licence_gm: i < 5 ? 5e5 - i*5e4 : 0, meetings: i % 4 === 0 ? 3 : 6, opps: 15 - i }));
  return { teams, people, updated_at: new Date().toISOString(), period: 'Week 1 of 5',
    challenge_dates: { start: '2026-06-01', end: '2026-07-03' }, special_awards: {}, warnings: [] };
}

(async () => {
  // 1) Static server for the repo on an ephemeral port.
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    fs.readFile(path.join(ROOT, p), (e, buf) => {
      if (e) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  await new Promise(r => server.listen(0, r));
  const BASE = `http://localhost:${server.address().port}/index.html`;

  const results = [], errors = [];
  const log = (name, ok, extra = '') => results.push({ ok, line: `${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}` });

  // Static i18n integrity: every t('key') used must exist in I18N.en, otherwise the
  // raw key string leaks to users (t() falls back to the key). The dynamic `tab.`
  // prefix has a code-level fallback to the tab's label, so it's exempted.
  {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const enStart = html.indexOf('en: {', html.indexOf('const I18N'));
    const enBlock = html.slice(enStart, html.indexOf('\n  },', enStart));
    const defined = new Set([...enBlock.matchAll(/'([^']+)'\s*:/g)].map(m => m[1]));
    const used = new Set([...html.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]));
    const missing = [...used].filter(k => k !== 'tab.' && !defined.has(k));
    log('i18n: every t() key is defined (no raw key leaks)', missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : `${used.size} keys ok`);
  }

  const browser = await PW.chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(5000);
  await ctx.route('**script.google.com**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockData()) }));
  // Vercel Speed Insights script is served only on Vercel (/_vercel/…) — no-op it here
  // so it doesn't 404 and log a console error off-platform.
  await ctx.route('**/_vercel/**', route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    if (await page.$('#login-pwd')) { await page.fill('#login-pwd', 'test'); await page.click('#login-btn'); }
    await page.waitForSelector('.tab-btn', { timeout: 10000 }).catch(() => {});
    log('App renders after login', !!(await page.$('.tab-btn')));

    // Dismiss first-visit onboarding tour (it overlays and intercepts clicks).
    if (await page.$('#tour-ov')) {
      const skip = await page.$('#tour-skip'); if (skip) await skip.click().catch(() => {});
      for (let i = 0; i < 8 && await page.$('#tour-ov'); i++) { const n = await page.$('#tour-next'); if (n) await n.click().catch(() => {}); await page.waitForTimeout(120); }
      log('Onboarding tour dismissed', !(await page.$('#tour-ov')));
    }

    for (const t of await page.$$eval('.tab-btn', els => els.map(e => e.dataset.tab))) {
      await page.click(`.tab-btn[data-tab="${t}"]`).catch(() => {});
      await page.waitForTimeout(120);
      const active = await page.$eval('.tab-btn.active', e => e.dataset.tab).catch(() => null);
      log(`Tab "${t}" switches`, active === t, active !== t ? `active=${active}` : '');
    }

    // "Find your position" CTA (regression guard for the inline-onclick bug).
    await page.click('.tab-btn[data-tab="golden"]').catch(() => {});
    await page.waitForTimeout(120);
    if (await page.$('#find-me-btn')) {
      await page.click('#find-me-btn');
      await page.waitForTimeout(250);
      const active = await page.$eval('.tab-btn.active', e => e.dataset.tab).catch(() => null);
      log('CTA "Find your position" switches to My Position', active === 'position' && !!(await page.$('#position-search')), `active=${active}`);
      const inView = await page.evaluate(() => { const e = document.getElementById('position-search'); if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight; });
      log('CTA reveals the search field in view (not stuck on the hero)', inView);
    } else log('CTA "Find your position" present', false);

    // My Position search + fuzzy + graceful no-match.
    await page.click('.tab-btn[data-tab="position"]').catch(() => {});
    if (await page.$('#position-search')) {
      await page.fill('#position-search', 'thorsager'); await page.waitForTimeout(220);
      log('My Position resolves a card', !!(await page.$('.position-card-wrap, .pc-card')));
      await page.fill('#position-search', 'garcia'); await page.waitForTimeout(220);
      log('Fuzzy/accent-insensitive search finds Garcia', !!(await page.$('.position-card-wrap, .suggestion-item, .pc-card')));
      await page.fill('#position-search', 'zzxqw'); await page.waitForTimeout(220);
      const msg = (await page.textContent('.position-result').catch(() => '')) || '';
      log('No-match shows a graceful message', /did you mean|No salesperson|No exact/i.test(msg));
    }

    // Player + team modals.
    await page.click('.tab-btn[data-tab="golden"]').catch(() => {});
    await page.waitForTimeout(120);
    const pl = await page.$('[data-player]');
    if (pl) { await pl.click(); await page.waitForTimeout(250); log('Player card modal opens', !!(await page.$('#player-overlay')));
      await page.keyboard.press('Escape'); await page.waitForTimeout(150); log('Player card closes on Esc', !(await page.$('#player-overlay'))); }
    await page.click('.tab-btn[data-tab="teams"]').catch(() => {});
    await page.waitForTimeout(120);
    const tm = await page.$('[data-team]');
    if (tm) { await tm.click(); await page.waitForTimeout(250); log('Team modal opens', !!(await page.$('#modal-overlay'))); await page.keyboard.press('Escape'); await page.waitForTimeout(120); }

    // Global search.
    if (await page.$('#search-btn')) {
      await page.click('#search-btn'); await page.waitForTimeout(220);
      const si = await page.$('#search-input, .search-modal input');
      log('Search modal opens', !!si);
      if (si) { await si.fill('vinther'); await page.waitForTimeout(220); log('Search returns a result', !!(await page.$('.search-result'))); }
      await page.keyboard.press('Escape'); await page.waitForTimeout(120);
    }

    // Theme + TV buttons (no crash), then exit any overlay.
    for (const id of ['#theme-btn', '#tv-btn']) if (await page.$(id)) { await page.click(id).catch(() => {}); await page.waitForTimeout(180); log(`Button ${id} (no crash)`, true); }
    await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(120);

    // Responsive: no horizontal overflow at mobile widths.
    for (const w of [320, 375, 768]) {
      await page.setViewportSize({ width: w, height: 780 }); await page.waitForTimeout(180);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      log(`No horizontal overflow @ ${w}px`, o <= 1, `overflow=${o}px`);
    }
  } catch (e) {
    errors.push('HARNESS: ' + e.message);
  } finally {
    await browser.close(); server.close();
  }

  console.log('\n===== UX SMOKE TEST =====');
  results.forEach(r => console.log(r.line));
  console.log(`\nJS errors: ${errors.length}`);
  errors.slice(0, 20).forEach(e => console.log('  ' + e));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${failed === 0 && errors.length === 0 ? '✅ ALL GREEN' : `❌ ${failed} check(s) failed, ${errors.length} JS error(s)`}`);
  process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
})();
