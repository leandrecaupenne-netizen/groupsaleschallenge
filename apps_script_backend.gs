// ============================================
// Devoteam World Cup 2026 — Backend API
// ============================================
//
// Reads the EXISTING OneBI-fed Google Sheet directly — no manual tabs to create.
// It maps the `Team Ranking` and `Challenge Ranking` tabs to the JSON shape the
// platform expects. Jose's OneBI workflow is untouched.
//
// Deploy: paste into Extensions → Apps Script of the sheet, then
// Deploy → New deployment → Web app → execute as Me, access "Anyone".
//
// API (what the platform actually calls):
//   GET  <URL>/exec?action=ping
//        -> {"ok":true,"time":...}                       connectivity / cold-start warm-up
//   POST <URL>/exec   body: {"action":"data","password":"…","fresh":false}
//        -> { teams, people, updated_at, period, challenge_dates, special_awards, warnings }
//        -> {"error":"unauthorized"} on a wrong/missing password
//        (send the body as text/plain to avoid a CORS preflight; set fresh:true to
//         bypass the 30s server cache, used by the admin manual-refresh button.)
//   GET  <URL>/exec?action=data
//        -> {"error":"unauthorized","hint":"POST …"}     data is never served over GET
//
// The access code is checked server-side only and is never returned to the client.

// ---- Settings you may edit ----------------------------------------------
const SETTINGS = {
  PASSWORD: 'devoteam2026',          // platform access code (change here, then redeploy)
  PERIOD: 'Week 1 of 5',             // label shown in the header
  CHALLENGE_START: '2026-06-01',
  CHALLENGE_END: '2026-07-03',
  EXCLUDED_TEAMS: ['MOROCCO', 'SERBIA', 'TUNISIA'],  // case-insensitive

  // Source tabs (name + the row that holds the column headers).
  TEAMS_TAB:  { name: 'Team Ranking',      headerRow: 2 },
  PEOPLE_TAB: { name: 'Challenge Ranking', headerRow: 1 }
};

// Map target field -> the column header to look for (matched case/space/newline
// insensitive). Use `header` for a single name or `headers` for a list of
// candidates (first one found wins). `numeric:true` coerces to a number;
// `optional:true` means "don't add a warning if the column is absent".
const TEAM_MAP = [
  { field: 'country',       header: 'Country' },
  { field: 'nickname',      headers: ['Nickname', 'Nick Name', 'Team Nickname', 'Team Name'], optional: true },
  { field: 'members',       header: 'Team Members',          numeric: true },
  { field: 'total_ps',      header: 'Total PS Booking',      numeric: true },
  { field: 'avg_ps',        header: 'Average PS Bookings',   numeric: true },
  { field: 'avg_gm',        header: 'Average GM',            numeric: true },
  { field: 'avg_meetings',  header: 'Average Meetings',      numeric: true },
  { field: 'avg_opps',      header: 'Average Opportunities', numeric: true }
];

const PEOPLE_MAP = [
  { field: 'name',          header: 'Full name' },
  { field: 'team',          header: 'TEAM' },
  { field: 'tenure',        header: 'Tenure' },
  { field: 'ps_total',      header: 'PS Booking Total',     numeric: true },
  { field: 'ps_total_gm',   header: 'PS Booking Total GM',  numeric: true },
  { field: 'ps_nb',         header: 'PS Booking NB',        numeric: true },
  { field: 'ps_nb_gm',      header: 'PS Booking NB GM',     numeric: true },
  { field: 'licence_gm',    header: 'Licence GM Amount',    numeric: true },
  { field: 'meetings',      header: 'Meetings',             numeric: true },
  { field: 'opps',          header: 'Opportunities Created',numeric: true }
];
// -------------------------------------------------------------------------

const SS = SpreadsheetApp.getActiveSpreadsheet();

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Normalize a header for tolerant matching: lowercase, collapse whitespace/newlines.
function normHeader(h) {
  return String(h == null ? '' : h).toLowerCase().replace(/\s+/g, ' ').trim();
}

function toNumber(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (s === '' || s.charAt(0) === '#') return 0;          // empty or #DIV/0!, #N/A, #REF!
  s = s.replace(/[% ]/g, '').replace(/,/g, '');       // strip %, nbsp, thousands commas
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Resolve a field's column index from a header row, trying `header` then each of
// `headers` (tolerant matching). Returns -1 if none match.
function resolveColIdx(headerRow, m) {
  const candidates = m.headers ? m.headers : [m.header];
  for (let i = 0; i < candidates.length; i++) {
    const idx = headerRow.indexOf(normHeader(candidates[i]));
    if (idx >= 0) return idx;
  }
  return -1;
}

// Read a tab into array of objects using the given field map. Any non-optional
// column that can't be found is reported into the optional `warnings` array
// (so the platform can surface a sheet/header mismatch without crashing).
function readMapped(tab, map, warnings) {
  const sheet = SS.getSheetByName(tab.name);
  if (!sheet) throw new Error('Tab not found: ' + tab.name);
  const values = sheet.getDataRange().getValues();
  if (values.length < tab.headerRow) return [];

  const headerRow = values[tab.headerRow - 1].map(normHeader);
  // Resolve each target field to a column index.
  const cols = map.map(m => {
    const idx = resolveColIdx(headerRow, m);
    if (idx < 0 && !m.optional && warnings) {
      const label = m.headers ? m.headers.join('" / "') : m.header;
      warnings.push('Column not found in "' + tab.name + '": "' + label + '"');
    }
    return { field: m.field, numeric: !!m.numeric, idx: idx };
  });

  const keyField = map[0].field; // first field (country / name) used to skip empty rows
  const out = [];
  for (let r = tab.headerRow; r < values.length; r++) {
    const row = values[r];
    const obj = {};
    cols.forEach(c => {
      let v = c.idx >= 0 ? row[c.idx] : '';
      obj[c.field] = c.numeric ? toNumber(v) : (v == null ? '' : String(v).trim());
    });
    if (!obj[keyField]) continue;  // skip blank rows
    out.push(obj);
  }
  return out;
}

function isExcluded(teamName) {
  const t = String(teamName || '').toUpperCase().trim();
  return SETTINGS.EXCLUDED_TEAMS.map(x => x.toUpperCase()).indexOf(t) !== -1;
}

// Optional override from a `Config` tab (key/value), if the user adds one.
function readConfig() {
  const sheet = SS.getSheetByName('Config');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const config = {};
  data.slice(1).forEach(row => { if (row[0]) config[String(row[0]).trim()] = row[1]; });
  return config;
}

// Optional `Special Awards` tab for AI Play / Transformative Deal winners.
function readSpecialAwards() {
  const sheet = SS.getSheetByName('Special Awards');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return {};
  const headers = data[0];
  const awards = {};
  data.slice(1).forEach(row => {
    if (row[0]) {
      const obj = {};
      headers.forEach((h, i) => obj[String(h).trim()] = row[i]);
      awards[String(row[0]).trim()] = obj;
    }
  });
  return awards;
}

// CacheService allows max ~100KB per key, so store the payload in chunks.
// All cache operations are best-effort: caching must never break the response.
const CACHE_CHUNK = 90000;

function cacheGetLarge(cache, baseKey) {
  try {
    const meta = cache.get(baseKey + '_n');
    if (!meta) return null;
    const n = parseInt(meta, 10);
    if (!(n > 0)) return null;
    const keys = [];
    for (let i = 0; i < n; i++) keys.push(baseKey + '_' + i);
    const parts = cache.getAll(keys);
    let out = '';
    for (let i = 0; i < n; i++) {
      const p = parts[baseKey + '_' + i];
      if (p == null) return null; // a chunk expired -> treat as a miss
      out += p;
    }
    return out;
  } catch (e) {
    return null;
  }
}

function cachePutLarge(cache, baseKey, value, ttl) {
  try {
    const obj = {};
    let n = 0;
    for (let i = 0; i < value.length; i += CACHE_CHUNK) {
      obj[baseKey + '_' + n] = value.substring(i, i + CACHE_CHUNK);
      n++;
    }
    obj[baseKey + '_n'] = String(n);
    cache.putAll(obj, ttl);
  } catch (e) {
    // best-effort only
  }
}

function getCorrectPassword() {
  const config = readConfig();
  return (config.password !== undefined && config.password !== '')
    ? String(config.password) : String(SETTINGS.PASSWORD);
}

function passwordOk(pw) {
  return String(pw == null ? '' : pw) === getCorrectPassword();
}

// Build (or serve from cache) the data payload as a JSON ContentService output.
function dataResponse(fresh) {
  const cache = CacheService.getScriptCache();
  const CACHE_KEY = 'wc_data_v2';
  if (!fresh) {
    const hit = cacheGetLarge(cache, CACHE_KEY);
    if (hit) {
      return ContentService.createTextOutput(hit)
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  const config = readConfig();
  const warnings = [];

  const teams = readMapped(SETTINGS.TEAMS_TAB, TEAM_MAP, warnings)
    .filter(t => !isExcluded(t.country));

  const people = readMapped(SETTINGS.PEOPLE_TAB, PEOPLE_MAP, warnings)
    .filter(p => !isExcluded(p.team))
    .map(p => {
      const tenure = String(p.tenure || '');
      return Object.assign({}, p, {
        is_rookie: tenure.indexOf('months') !== -1 || tenure.indexOf('<') !== -1,
        yellow_meetings: (p.meetings || 0) < 5,
        yellow_gm: (p.ps_total_gm || 0) < 0.25 && (p.ps_total || 0) > 0
      });
    });

  const payload = JSON.stringify({
    teams: teams,
    people: people,
    updated_at: config.last_update || new Date().toISOString(),
    period: config.period || SETTINGS.PERIOD,
    challenge_dates: {
      start: config.challenge_start || SETTINGS.CHALLENGE_START,
      end: config.challenge_end || SETTINGS.CHALLENGE_END
    },
    special_awards: readSpecialAwards(),
    warnings: warnings
  });

  cachePutLarge(cache, CACHE_KEY, payload, 30); // cache 30s (best-effort)
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'data';
  try {
    if (action === 'ping') {
      return jsonResponse({ ok: true, time: new Date().toISOString() });
    }

    if (action === 'data') {
      // Data is never served over GET — the access code must not travel in a URL
      // (URLs leak into history, logs and Referer headers). The platform POSTs the
      // password instead (see doPost). Always refuse here, with a usage hint.
      return jsonResponse({
        error: 'unauthorized',
        hint: 'POST {action:"data", password} — data is not served over GET.'
      });
    }

    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'data') {
      if (!passwordOk(data.password)) {
        return jsonResponse({ error: 'unauthorized' });
      }
      return dataResponse(data.fresh === true || data.fresh === '1');
    }

    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
