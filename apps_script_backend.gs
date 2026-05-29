// ============================================
// Devoteam World Cup 2026 — Backend API
// ============================================
//
// Paste this entire file into Extensions → Apps Script of the Google Sheet.
// No modification needed. Deploy as a Web App (see CLAUDE.md §6 / README.md).

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// CORS-friendly JSON response
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Read a sheet as array of objects (headers from row 1)
function readSheetAsObjects(sheetName) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = row[i];
        // Convert numeric strings to numbers if possible, ignore errors
        if (typeof v === 'string' && v.startsWith('#')) v = 0;
        obj[h] = v;
      });
      return obj;
    });
}

// Read config as flat key/value object
function readConfig() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Config');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const config = {};
  data.slice(1).forEach(row => {
    if (row[0]) config[row[0]] = row[1];
  });
  return config;
}

// Read special awards (optional sheet)
function readSpecialAwards() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Special Awards');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return {};
  const headers = data[0];
  const awards = {};
  data.slice(1).forEach(row => {
    if (row[0]) {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      awards[row[0]] = obj;
    }
  });
  return awards;
}

// Main GET endpoint
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'data';

  try {
    if (action === 'data') {
      const teams = readSheetAsObjects('Teams');
      const peopleRaw = readSheetAsObjects('People');
      const config = readConfig();
      const specialAwards = readSpecialAwards();

      // Compute derived fields for people
      const people = peopleRaw.map(p => {
        const tenure = String(p.tenure || '');
        return {
          ...p,
          is_rookie: tenure.includes('months') || tenure.includes('<'),
          yellow_meetings: (p.meetings || 0) < 5,
          yellow_gm: (p.ps_total_gm || 0) < 0.25 && (p.ps_total || 0) > 0
        };
      });

      return jsonResponse({
        teams,
        people,
        updated_at: config.last_update || new Date().toISOString(),
        period: config.period || 'Current',
        challenge_dates: {
          start: config.challenge_start || '2026-06-01',
          end: config.challenge_end || '2026-07-03'
        },
        special_awards: specialAwards
      });
    }

    if (action === 'ping') {
      return jsonResponse({ ok: true, time: new Date().toISOString() });
    }

    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

// Password verification endpoint (POST)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'verify_password') {
      const config = readConfig();
      const correctPassword = config.password || '';
      return jsonResponse({
        ok: String(data.password) === String(correctPassword)
      });
    }

    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
