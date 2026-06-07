// Offline contract test for apps_script_backend.gs — runs the back-end in a mocked
// Apps Script sandbox (no deployment needed) and asserts the API the platform relies
// on. Run after editing the .gs and before redeploying:  node test/backend-contract.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'apps_script_backend.gs'), 'utf8');

// --- Mock sheet data ---
const SHEETS = {
  'Team Ranking': [
    [],                                                    // row1 (blank, headers on row2)
    ['Country','Nickname','Team Members','Total PS Booking','Average PS Bookings','Average GM','Average Meetings','Average Opportunities'],
    ['FR - Creative Tech 2','THE STORMERS',14,2440200.02,174300,0.1758,5.61,0.28],
    ['LUXEMBOURG','',4,8056326,2014081,0.27,5.67,6.75],
    ['MOROCCO','EXCLUDED',3,999,999,0.5,9,9],            // must be filtered out
  ],
  'Challenge Ranking': [
    ['Full name','TEAM','Tenure','PS Booking Total','PS Booking Total GM','PS Booking NB','PS Booking NB GM','Licence GM Amount','Meetings','Opportunities Created'],
    ['Louis MASSON','LUXEMBOURG','Over a year',2699249,0.30,712462,0.29,26906,7.09,17],
    ['Rookie Kid','FR - Creative Tech 2','<6 months',1000,0.1,500,0.1,0,3,2],   // is_rookie + yellow_meetings (0<3<5)
    ['No Data Nils','LUXEMBOURG','',1000,0.1,500,0.1,0,0,0],                     // meetings=0 -> NOT carded
    ['Excluded Guy','MOROCCO','Over a year',1,0.5,1,0.5,0,9,1],                  // filtered
  ],
};

function makeSheet(name){
  const data = SHEETS[name];
  return data ? { getDataRange: () => ({ getValues: () => data }) } : null;
}
const cacheStore = {};
const sandbox = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getId: () => 'X', getSheetByName: makeSheet }) },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: (s) => ({ _body: s, setMimeType(){ return this; } }),
  },
  CacheService: { getScriptCache: () => ({
    get: k => cacheStore[k] || null,
    getAll: ks => { const o={}; ks.forEach(k=>{ if(cacheStore[k]!=null) o[k]=cacheStore[k]; }); return o; },
    putAll: (o) => Object.assign(cacheStore, o),
  }) },
  console,
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

const body = r => JSON.parse(r._body);
let fails = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok?'  \x1b[32m✓\x1b[0m ':'  \x1b[31m✗\x1b[0m ')+label + (ok?'':`  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`));
  if(!ok) fails++;
};

// 1. ping
eq('GET ping -> ok:true', body(sandbox.doGet({parameter:{action:'ping'}})).ok, true);

// 2. GET data refused with exact hint
const g = body(sandbox.doGet({parameter:{action:'data'}}));
eq('GET data -> unauthorized', g.error, 'unauthorized');
eq('GET data -> exact hint', g.hint, 'POST {action:"data", password} — data is not served over GET.');

// 3. POST wrong password
eq('POST data wrong pw -> unauthorized',
   body(sandbox.doPost({postData:{contents:JSON.stringify({action:'data',password:'nope'})}})).error, 'unauthorized');

// 4. POST correct password -> payload
const p = body(sandbox.doPost({postData:{contents:JSON.stringify({action:'data',password:'devoteam2026',fresh:true})}}));
eq('teams count (Morocco filtered)', p.teams.length, 2);
eq('nickname mapped', p.teams[0].nickname, 'THE STORMERS');
eq('people count (Morocco filtered)', p.people.length, 3);
const byName = Object.fromEntries(p.people.map(x => [x.name, x]));
eq('is_rookie derived', byName['Rookie Kid'].is_rookie, true);
eq('yellow_meetings derived (0<3<5 -> carded)', byName['Rookie Kid'].yellow_meetings, true);
eq('yellow_meetings NOT carded when meetings=0 (not reported)', byName['No Data Nils'].yellow_meetings, false);
eq('warnings empty (all headers found)', p.warnings, []);
eq('payload top-level keys', Object.keys(p).sort(),
   ['challenge_dates','people','period','special_awards','teams','updated_at','warnings']);

// 5. Unknown actions
eq('POST verify_password -> Unknown action (removed)',
   body(sandbox.doPost({postData:{contents:JSON.stringify({action:'verify_password',password:'x'})}})).error, 'Unknown action');

console.log(fails ? `\n\x1b[31m${fails} FAILED\x1b[0m` : '\n\x1b[32mALL BACKEND CONTRACT CHECKS PASSED\x1b[0m');
process.exit(fails?1:0);
