# History — weekly snapshots

Point-in-time captures of the live data, one JSON per capture (`YYYY-MM-DD.json`),
so the platform can show **evolution over the 5 weeks** (rank movement week-over-week,
progression curves) rather than only the in-memory "since last refresh" movers.

## Format (trimmed — ranks are derived at read time, not stored)

```jsonc
{
  "date": "2026-06-08",
  "captured_at": "2026-06-08T09:10:00Z",   // when the snapshot was taken (UTC)
  "period": "Week 1 of 5",
  "sheet_updated_at": "...",               // the source sheet's last-edit time
  "teams":  [ { "country", "members", "total_ps", "avg_ps", "avg_gm", "avg_opps", "avg_meetings" } ],
  "people": [ { "name", "team", "ps_total", "ps_nb", "opps", "ps_total_gm", "meetings", "licence_gm", "is_rookie" } ]
}
```

The fields are the same ones that drive every board (Team Ranking = `avg_ps`,
Golden Boot = `ps_nb`, Playmaker = `opps`, Licence = `licence_gm`, Rookie = `ps_nb`
among rookies). To compute a rank for any week, sort the relevant array — no need to
store ranks.

## How snapshots are produced

- **Baseline (Week 1)**: captured manually on 2026-06-08 before the first weekly sync.
- **Going forward**: see the plan in `DECISIONS.md` — a scheduled capture (one per week)
  appends a new `YYYY-MM-DD.json` here. Keep one snapshot per sync so each "week" is a
  clean comparison point.

## Using it in the front-end

The snapshots are static files served by Vercel (e.g. `/history/2026-06-08.json`), so the
app can fetch the previous week's snapshot and diff it against the live data to show
rank deltas (▲/▼) and value changes per team/player.
