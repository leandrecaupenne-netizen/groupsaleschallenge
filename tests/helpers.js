// @ts-check
// Shared test helpers: mock the Apps Script backend + log in.
//
// Nothing in the suite touches the real Google Apps Script endpoint. We
// intercept every request to script.google.com and answer with the fixture,
// so tests are deterministic, fast and run offline / in CI without secrets.

const { ACCESS_CODE, dataPayload } = require('./fixtures/mock-data');

// Matches CONFIG.APPS_SCRIPT_URL in index.html (…/macros/s/<id>/exec).
const BACKEND_GLOB = '**/macros/s/**';

/**
 * Intercept the Apps Script endpoint and serve canned JSON.
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 * @param {object} [opts.data]        payload returned for a correct password (defaults to the fixture)
 * @param {string} [opts.password]    the password considered valid (defaults to the fixture's)
 * @param {boolean} [opts.fail]       when true, every data request 500s (drives the error / offline UI)
 * @param {number} [opts.delayMs]     artificial latency before responding
 * @param {() => void} [opts.onData]  called each time a data request is served (e.g. count polls)
 */
async function mockBackend(page, opts = {}) {
  const data = opts.data || dataPayload;
  const validPwd = opts.password != null ? opts.password : ACCESS_CODE;

  await page.route(BACKEND_GLOB, async (route) => {
    const req = route.request();
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));

    // GET …?action=ping — the login-screen prewarm.
    if (req.method() === 'GET') {
      return route.fulfill({ json: { ok: true, time: new Date().toISOString() } });
    }

    if (opts.fail) {
      return route.fulfill({ status: 500, body: 'backend down' });
    }

    let body = {};
    try { body = JSON.parse(req.postData() || '{}'); } catch (e) { /* ignore */ }

    if (body.action === 'data') {
      if (String(body.password) !== String(validPwd)) {
        return route.fulfill({ json: { error: 'unauthorized' } });
      }
      if (opts.onData) opts.onData();
      return route.fulfill({ json: data });
    }

    return route.fulfill({ json: { error: 'Unknown action' } });
  });
}

/**
 * Seed an authenticated session in localStorage so the app skips the login
 * screen and paints straight away. Must be called before page.goto().
 * @param {import('@playwright/test').Page} page
 * @param {string} [password]
 */
async function seedSession(page, password = ACCESS_CODE) {
  await page.addInitScript(([pwd]) => {
    localStorage.setItem('devoteam_wc_session_v1', '1');
    localStorage.setItem('devoteam_wc_pwd_v1', pwd);
    localStorage.setItem('devoteam_wc_intro_seen_v1', '1'); // skip the first-visit hint
  }, [password]);
}

/**
 * Full convenience: mock the backend, seed the session, load the app and wait
 * for the leaderboard to be on screen.
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts] forwarded to mockBackend
 */
async function gotoApp(page, opts = {}) {
  await mockBackend(page, opts);
  await seedSession(page, opts.password);
  await page.goto('/');
  await page.locator('#tabs-bar').waitFor({ state: 'visible' });
}

module.exports = { mockBackend, seedSession, gotoApp, BACKEND_GLOB, ACCESS_CODE };
