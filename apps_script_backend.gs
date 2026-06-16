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
// Test: <URL>/exec?action=ping → {"ok":true,...}

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
// insensitive). Listed fields with numeric:true are coerced to numbers.
// Each field tries its exact header(s) first, then — if the OneBI wording has drifted —
// falls back to its `match` keyword regex (run against the actual headers). The regexes
// are deliberately specific (lookaheads keep Total vs NB vs GM apart) so a fallback can't
// grab a sibling column. Matching is case/space/newline-insensitive (see normHeader).
const TEAM_MAP = [
  { field: 'country',       header: 'Country',               match: /country|pays|team name|nation/ },
  // Optional nickname column (Jose is still filling these in). Several header
  // spellings accepted; missing → empty string, no warning.
  { field: 'nickname',      headers: ['Team Nickname', 'Team Nicknames', 'Nickname', 'Nicknames', 'Surnom', 'Surnom équipe'], match: /nick|surnom/, optional: true },
  { field: 'members',       header: 'Team Members',          match: /member|effectif|head ?count/, numeric: true },
  { field: 'total_ps',      header: 'Total PS Booking',      match: /total.*(ps|booking)|total.*business/, numeric: true },
  { field: 'avg_ps',        header: 'Average PS Bookings',   match: /(average|avg|moyenne).*(ps|booking)/, numeric: true },
  { field: 'avg_gm',        header: 'Average GM',            match: /(average|avg|moyenne).*gm|marge/, numeric: true, pct: true },
  { field: 'avg_meetings',  header: 'Average Meetings',      match: /meeting|rdv|rendez/, numeric: true },
  { field: 'avg_opps',      header: 'Average Opportunities', match: /opportunit/, numeric: true }
];

const PEOPLE_MAP = [
  { field: 'name',          header: 'Full name',            match: /full ?name|nom complet|salesperson|consultant/ },
  { field: 'team',          header: 'TEAM',                 match: /^team$|\bteam\b|équipe|entity/ },
  { field: 'tenure',        header: 'Tenure',               match: /tenure|ancien|seniority/ },
  // Total vs NB vs their GM variants — lookaheads keep them from grabbing each other.
  { field: 'ps_total',      header: 'PS Booking Total',     match: /ps.*total(?!.*gm)|total.*business(?!.*gm)/, numeric: true },
  { field: 'ps_total_gm',   header: 'PS Booking Total GM',  match: /ps.*total.*gm|total.*business.*gm/, numeric: true, pct: true },
  { field: 'ps_nb',         header: 'PS Booking NB',        match: /ps.*nb(?!.*gm)|new business(?!.*gm)/, numeric: true },
  { field: 'ps_nb_gm',      header: 'PS Booking NB GM',     match: /ps.*nb.*gm|new business.*gm|nb gm/, numeric: true, pct: true },
  { field: 'licence_gm',    header: 'Licence GM Amount',    match: /licen[cs]e/, numeric: true },
  { field: 'meetings',      header: 'Meetings',             match: /meeting|rdv|rendez/, numeric: true },
  // Header wording drifts in OneBI (e.g. "Opportunities", "NB Opportunities Created",
  // "Opportunités créées"). Accept several spellings, then fall back to any header that
  // contains "opportunit" so a rename doesn't flatline the Playmaker board to 0.
  { field: 'opps',          headers: ['Opportunities Created', 'Opportunities', 'Opportunities Created (Stage 2+)', 'NB Opportunities Created', 'Opps Created', 'Opps', 'Opportunités créées', 'Opportunités'], match: /opportunit/, numeric: true }
];
// -------------------------------------------------------------------------

const SS = SpreadsheetApp.getActiveSpreadsheet();

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// When no Config.last_update is set, fall back to the spreadsheet's real last-edit
// time so the "Last updated" label reflects data freshness. Best-effort: if the
// Drive scope isn't granted, degrade to current time rather than failing.
function lastDataUpdate() {
  try {
    return DriveApp.getFileById(SS.getId()).getLastUpdated().toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
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

// Read a tab into array of objects using the given field map.
// `warnings` (optional) collects any mapped column whose header wasn't found, so
// a renamed/typo'd OneBI header surfaces as a visible warning instead of silently
// becoming 0 everywhere (which would flatline the leaderboard with no error).
function readMapped(tab, map, warnings) {
  const sheet = SS.getSheetByName(tab.name);
  // A missing/renamed tab must NOT crash the whole response (which the front-end
  // would surface as a generic load failure with no clue). Surface it as a warning
  // and return no rows, so partial data still paints and the admin sees the cause.
  if (!sheet) {
    if (warnings) warnings.push('Tab not found: "' + tab.name + '" — was it renamed or moved? Expected exactly this name.');
    return [];
  }
  const values = sheet.getDataRange().getValues();
  if (values.length < tab.headerRow) return [];

  const headerRow = values[tab.headerRow - 1].map(normHeader);
  // Resolve each target field to a column index. A field may list several candidate
  // headers (m.headers) — the first one found wins — and may be optional (no warning
  // if absent, e.g. Team Nickname which Jose is still filling in).
  const cols = map.map(m => {
    const cands = (m.headers || [m.header]).map(normHeader);
    let idx = -1;
    for (let k = 0; k < cands.length; k++) { idx = headerRow.indexOf(cands[k]); if (idx >= 0) break; }
    // Last resort: a keyword regex (m.match) against the actual headers, so a reworded
    // column ("Opportunities Created" → "NB Opportunities") still resolves.
    if (idx < 0 && m.match) idx = headerRow.findIndex(h => m.match.test(h));
    return { field: m.field, numeric: !!m.numeric, pct: !!m.pct, optional: !!m.optional, idx: idx };
  });

  // Flag any required column we couldn't locate by header (optional ones stay quiet).
  // Include the headers actually present so an admin can see the real (drifted) name.
  if (warnings) {
    const seen = headerRow.filter(function (h) { return h; }).join(' | ');
    map.forEach((m, i) => {
      if (cols[i].idx < 0 && !m.optional) {
        warnings.push(tab.name + ': column not found for "' + (m.headers ? m.headers[0] : m.header) + '" (field ' + m.field + '). Headers seen: ' + seen);
      }
    });
  }

  const keyField = map[0].field; // first field (country / name) used to skip empty rows
  const out = [];
  for (let r = tab.headerRow; r < values.length; r++) {
    const row = values[r];
    const obj = {};
    cols.forEach(c => {
      let v = c.idx >= 0 ? row[c.idx] : '';
      if (c.numeric) {
        let num = toNumber(v);
        // GM ratios entered as a percentage (e.g. 27 or "27%") → back to a decimal.
        if (c.pct && num > 1.5) num = num / 100;
        obj[c.field] = num;
      } else {
        obj[c.field] = (v == null ? '' : String(v).trim());
      }
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

// CacheService allows max ~100KB (bytes) per key, so store the payload in chunks.
// 45000 CHARACTERS stays under 100KB even when every char is a 2-byte accented
// name (é, ü, ø, þ…) — at 90000 chars an accent-heavy chunk could exceed the byte
// cap, making putAll throw and silently disabling the cache for all 400 users.
// All cache operations are best-effort: caching must never break the response.
const CACHE_CHUNK = 45000;

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
        // Only flag a yellow card once the player has live data — otherwise a blank
        // `meetings` column at challenge start would flag every player.
        yellow_meetings: (p.meetings || 0) < 5 && ((p.ps_total || 0) > 0 || (p.ps_nb || 0) > 0 || (p.meetings || 0) > 0),
        yellow_gm: (p.ps_total_gm || 0) < 0.25 && (p.ps_total || 0) > 0
      });
    });

  const payload = JSON.stringify({
    teams: teams,
    people: people,
    // Prefer an explicit Config.last_update; otherwise reflect when the sheet was
    // actually last edited (not "now", which would falsely look fresh every build).
    updated_at: config.last_update || lastDataUpdate(),
    period: config.period || SETTINGS.PERIOD,
    challenge_dates: {
      start: config.challenge_start || SETTINGS.CHALLENGE_START,
      end: config.challenge_end || SETTINGS.CHALLENGE_END
    },
    special_awards: readSpecialAwards(),
    warnings: warnings   // [] in the happy path; populated if a header didn't match
  });

  cachePutLarge(cache, CACHE_KEY, payload, 60); // cache 60s (best-effort) — data changes ~weekly, so this halves Sheet reads/concurrency with zero visible impact (admin ↻ bypasses it)
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
      // Data is POST-only: the access code travels in the request body, never as a
      // ?pw= query string (which would leak the code into Apps Script execution logs,
      // browser history and referrer headers). The web app always POSTs (see doPost).
      return jsonResponse({ error: 'unauthorized', hint: 'POST {action:"data", password} — data is not served over GET.' });
    }

    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    // Don't leak internals (function names / line numbers) to anonymous callers.
    return jsonResponse({ error: 'server_error' });
  }
}

// Keep the Web App warm so the FIRST real request never hits a multi-second cold
// start (which leaves users staring at the loader). Also primes the 60s data cache
// so the next visitor's fetch is instant.
//
// SET UP THE TRIGGER (one-off):
//   Apps Script editor → ⏰ Triggers (left clock icon) → "+ Add Trigger"
//   → Function: keepWarm · Event source: Time-driven · Type: Minutes timer
//   → Every 5 minutes → Save.
function keepWarm() {
  try { dataResponse(true); } catch (e) {}
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
    return jsonResponse({ error: 'server_error' });
  }
}
