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
const TEAM_MAP = [
  { field: 'country',       header: 'Country' },
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

// Read a tab into array of objects using the given field map.
function readMapped(tab, map) {
  const sheet = SS.getSheetByName(tab.name);
  if (!sheet) throw new Error('Tab not found: ' + tab.name);
  const values = sheet.getDataRange().getValues();
  if (values.length < tab.headerRow) return [];

  const headerRow = values[tab.headerRow - 1].map(normHeader);
  // Resolve each target field to a column index.
  const cols = map.map(m => ({
    field: m.field,
    numeric: !!m.numeric,
    idx: headerRow.indexOf(normHeader(m.header))
  }));

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

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'data';
  const fresh = e && e.parameter && (e.parameter.fresh === '1' || e.parameter.nocache === '1');
  try {
    if (action === 'ping') {
      return jsonResponse({ ok: true, time: new Date().toISOString() });
    }

    if (action === 'data') {
      // Serve from a short-lived cache to keep polling fast and save quota.
      // `?fresh=1` (manual refresh) bypasses the cache and refreshes it.
      const cache = CacheService.getScriptCache();
      const CACHE_KEY = 'wc_data_v1';
      if (!fresh) {
        const hit = cache.get(CACHE_KEY);
        if (hit) {
          return ContentService.createTextOutput(hit)
            .setMimeType(ContentService.MimeType.JSON);
        }
      }

      const config = readConfig();

      const teams = readMapped(SETTINGS.TEAMS_TAB, TEAM_MAP)
        .filter(t => !isExcluded(t.country));

      const people = readMapped(SETTINGS.PEOPLE_TAB, PEOPLE_MAP)
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
        special_awards: readSpecialAwards()
      });

      cache.put(CACHE_KEY, payload, 30); // cache 30s
      return ContentService.createTextOutput(payload)
        .setMimeType(ContentService.MimeType.JSON);
    }

    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'verify_password') {
      const config = readConfig();
      const correct = (config.password !== undefined && config.password !== '')
        ? config.password : SETTINGS.PASSWORD;
      return jsonResponse({ ok: String(data.password) === String(correct) });
    }
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
