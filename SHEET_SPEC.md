# Google Sheet Spec — Devoteam World Cup 2026

> Document à transmettre à Jose (Group Sales) pour la création de la Google Sheet qui alimentera la plateforme web du Sales Challenge.

---

## Overview

The platform reads data from a Google Sheet maintained by Jose. The Sheet acts as the **single source of truth** for live data, with values pulled from OneBI reports.

**File name suggestion**: `Devoteam World Cup 2026 — Live Data`

**Sharing**:
- Léandre: edit access (to set up the Apps Script and validate structure)
- Jose: edit access (primary data owner)
- The Apps Script runs under one of these accounts and reads the Sheet on behalf of the web app

**Sheet ID**: copy the long string in the URL between `/d/` and `/edit`. Share it with Léandre once created.

---

## Tab 1: `Teams`

Row 1 = headers, data starts at row 2. **32 teams expected** (Serbia, Tunisia and Morocco excluded).

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `country` | string | `LUXEMBOURG` | Official team name, **must match exactly** the `team` value in the People tab |
| `members` | int | `4` | Number of active members |
| `total_ps` | number | `8056326.49` | Total PS Bookings (sum for the team) |
| `avg_ps` | number | `2014081.62` | Average PS Bookings per person — **used for team ranking** |
| `avg_gm` | number | `0.27` | Average GM as **decimal** (0.27 = 27%) |
| `avg_meetings` | number | `5.67` | Average meetings per week (across members) |
| `avg_opps` | number | `6.75` | Average opportunities created |

**Important**:
- GM values must be in **decimal** form (`0.27`, not `27` or `"27%"`)
- Don't include header rows for groupings (e.g. no "FRANCE" group row above the FR teams)
- One row = one team

---

## Tab 2: `People`

Row 1 = headers, data starts at row 2. **377 rows expected**.

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `name` | string | `Louis MASSON` | Full name, must be unique |
| `team` | string | `LUXEMBOURG` | **Must match exactly** a `country` in the Teams tab |
| `tenure` | string | `Over a year` | Allowed values: `Over a year`, `Over 6 months`, `<6 months` |
| `ps_total` | number | `2699249.5` | PS Bookings Total (all business) |
| `ps_total_gm` | number | `0.30` | GM decimal on PS Total — used for Yellow Card detection (< 25%) |
| `ps_nb` | number | `712462` | PS Bookings New Business — **used for Golden Boot ranking** |
| `ps_nb_gm` | number | `0.29` | GM decimal on PS NB |
| `licence_gm` | number | `26906` | Licence GM Amount — used for Licence award |
| `meetings` | number | `7.09` | Meetings per week — used for Yellow Card detection (< 5) |
| `opps` | number | `17` | Opportunities created — **used for Playmaker ranking**. Pre-filter from OneBI: Stage 2+ and > €50K only |

**Important**:
- Replace formula errors (`#DIV/0!`, `#N/A`, `#REF!`) with `0` or empty cells
- Don't include the 3 excluded countries (SERBIA, TUNISIA, MOROCCO) — leave them out entirely
- Don't include inactive employees
- The `team` field is critical: any typo means the person will not appear in the team drilldown view

---

## Tab 3: `Config`

Configuration values for the platform. Two columns: `key` and `value`.

| key | value | description |
|-----|-------|-------------|
| `password` | `devoteam2026` | Access password to the platform — communicated to all sales |
| `last_update` | `2026-06-15T14:30:00Z` | ISO timestamp, **must be updated** every time the Teams or People tabs are refreshed |
| `period` | `Week 3 of 5` | Label displayed in the platform header |
| `challenge_start` | `2026-06-01` | Challenge start date |
| `challenge_end` | `2026-07-03` | Challenge end date |

**Auto-updating `last_update`** (optional but recommended):
Use this formula in the value cell of `last_update`:

```
=TEXT(NOW(),"YYYY-MM-DD""T""HH:MM:SS""Z""")
```

This way every recalc of the sheet updates the timestamp automatically. Force a recalc by editing any other cell, or use `File → Recalculation → On change`.

---

## Tab 4: `Special Awards` (optional, until winners are chosen)

For AI Play and Transformative Deal awards selected by jury panels.

| key | name | team | description |
|-----|------|------|-------------|
| `ai_play_winner` | (winner name) | (their team) | Description of the AI deal |
| `transformative_deal_winner` | (winner name) | (their team) | Description of the deal |

If left empty, the platform displays "To be selected after the challenge".

---

## Update workflow

When you refresh the data (e.g. weekly):

1. Pull the latest OneBI report
2. Replace the data in tabs `Teams` and `People` (keep the headers in row 1)
3. Update `last_update` in `Config` (or use the auto formula)
4. Optionally update `period` in `Config` if the week label changes

The web platform automatically polls the Sheet every 30 seconds, so changes are visible to all users within ~1 minute without any further action.

---

## Common pitfalls to avoid

- **Mismatched team names** between People and Teams → person doesn't appear in team detail view
- **GM as percentage instead of decimal** → Yellow Cards trigger wrongly
- **Numbers stored as text** → ranking breaks. Make sure to format columns as Number, not Text
- **Empty rows mixed in the data** → the API filters them out, but cleaner to remove
- **Excluded countries left in** → they appear in the leaderboard. Remove SERBIA/TUNISIA/MOROCCO rows entirely.
- **Forgetting to update `last_update`** → users see a stale timestamp and don't trust the data

---

## Questions / debugging

If something doesn't appear correctly on the platform:
1. Check that the Sheet structure matches this spec exactly (column names, casing)
2. Check that `last_update` was bumped after the latest data refresh
3. Reach out to Léandre with the Sheet URL and a description of what's missing

---

*Spec v1 — May 2026*
