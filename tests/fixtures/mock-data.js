// @ts-check
// Deterministic mock of the Apps Script `action: 'data'` payload.
//
// Shape mirrors apps_script_backend.gs → dataResponse(): teams[], people[]
// (with the server-computed is_rookie / yellow_meetings / yellow_gm flags),
// updated_at, period, challenge_dates, special_awards.
//
// Small, hand-built and stable so assertions can hard-code expected order:
//   Team ranking is by avg_ps   → LUXEMBOURG > FR - M CLOUD > DENMARK
//   Golden Boot is by ps_nb     → Louis MASSON > Carlos MARAUI > ...
//   Playmaker is by opps        → Carlos MARAUI > Louis MASSON > ...

const ACCESS_CODE = 'devoteam2026';

const teams = [
  { country: 'LUXEMBOURG',  members: 4, total_ps: 8056326, avg_ps: 2014081, avg_gm: 0.27, avg_meetings: 5.7, avg_opps: 6.8 },
  { country: 'FR - M CLOUD', members: 5, total_ps: 7200000, avg_ps: 1440000, avg_gm: 0.31, avg_meetings: 6.2, avg_opps: 7.1 },
  { country: 'DENMARK',     members: 3, total_ps: 3600000, avg_ps: 1200000, avg_gm: 0.22, avg_meetings: 4.1, avg_opps: 5.0 }
];

/** Build a person with the same derived flags the backend adds. */
function person(p) {
  const tenure = String(p.tenure || 'Over a year');
  return Object.assign(
    { tenure, ps_total_gm: 0.30, ps_nb_gm: 0.29, licence_gm: 0, meetings: 6, opps: 0 },
    p,
    {
      is_rookie: tenure.indexOf('months') !== -1 || tenure.indexOf('<') !== -1,
      yellow_meetings: (p.meetings || 0) < 5,
      yellow_gm: (p.ps_total_gm || 0.30) < 0.25 && (p.ps_total || 0) > 0
    }
  );
}

const people = [
  person({ name: 'Louis MASSON',   team: 'LUXEMBOURG',   ps_total: 2699249, ps_nb: 712462, opps: 12, meetings: 7.1, licence_gm: 26906 }),
  person({ name: 'Carlos MARAUI',  team: 'FR - M CLOUD', ps_total: 2100000, ps_nb: 540000, opps: 17, meetings: 6.4, licence_gm: 12000 }),
  person({ name: 'Sophie DUBOIS',  team: 'DENMARK',      ps_total: 1500000, ps_nb: 410000, opps: 9,  meetings: 4.2, ps_total_gm: 0.20 }), // yellow: low meetings + low GM
  person({ name: 'Marco ROSSI',    team: 'LUXEMBOURG',   ps_total: 900000,  ps_nb: 300000, opps: 6,  meetings: 5.5, tenure: 'Over 6 months' }), // rookie
  person({ name: 'Lena MØLLER',    team: 'DENMARK',      ps_total: 600000,  ps_nb: 150000, opps: 4,  meetings: 3.8, tenure: '<6 months' })      // rookie + yellow meetings
];

const dataPayload = {
  teams,
  people,
  updated_at: '2026-06-18T14:30:00Z',
  period: 'Week 3 of 5',
  challenge_dates: { start: '2026-06-01', end: '2026-07-03' },
  special_awards: {}
};

module.exports = { ACCESS_CODE, dataPayload, teams, people };
