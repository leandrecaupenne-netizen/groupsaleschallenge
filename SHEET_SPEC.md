# Google Sheet Spec — Devoteam World Cup 2026

> How the platform reads the **existing** OneBI-fed Google Sheet. Good news for Jose:
> **nothing new to build.** The backend reads the tabs you already maintain. This doc
> just lists the columns that must stay stable so the platform keeps working.

---

## Overview

The platform reads data from the Google Sheet maintained by Jose (fed from OneBI).
A Google Apps Script (`apps_script_backend.gs`) maps two existing tabs to the JSON the
web app consumes. Teams ranking comes from `Team Ranking`, individual data from
`Challenge Ranking`. Columns are matched **by header name** (case / spaces / line-breaks
are ignored), so column order can change without breaking anything — only the **header
text** matters.

**Sheet ID**: the long string in the URL between `/d/` and `/edit`. Share it with Léandre.

---

## Tab 1: `Team Ranking` (already exists)

Headers are on **row 2**, data from **row 3**. The backend reads these columns by name:

| Header (must stay) | Used as | Notes |
|--------------------|---------|-------|
| `Country` | team name | Must match the `TEAM` value in `Challenge Ranking` |
| `Team Members` | member count | |
| `Total PS Booking` | team total | |
| `Average PS Bookings` | **team ranking** | Teams are sorted on this |
| `Average GM` | avg GM | decimal (0.27 = 27%) |
| `Average Meetings` | avg meetings/week | |
| `Average Opportunities` | avg opps | |

The 3 excluded teams (`MOROCCO`, `SERBIA`, `TUNISIA`) are **filtered out automatically by
the backend** — you can leave them in the sheet, they just won't appear on the platform.
That leaves 32 ranked teams.

---

## Tab 2: `Challenge Ranking` (already exists)

Headers on **row 1**, data from **row 2**. The backend reads these columns by name:

| Header (must stay) | Used as | Notes |
|--------------------|---------|-------|
| `Full name` | person name | |
| `TEAM` | team | Should match a `Country` in `Team Ranking` for the team drilldown |
| `Tenure` | tenure | `Over a year` / `Over 6 months` / `<6 months` → drives Rookie + 🌱 badge |
| `PS Booking Total` | PS total | |
| `PS Booking Total GM` | GM total | decimal — Yellow Card if < 0.25 |
| `PS Booking NB` | **Golden Boot ranking** | New business bookings |
| `PS Booking NB GM` | GM new business | decimal |
| `Licence GM Amount` | **Licence award** | |
| `Meetings` | meetings/week | Yellow Card if < 5 |
| `Opportunities Created` | **Playmaker ranking** | |

After excluding the 3 countries this is **377 people**. People whose `TEAM` has no row in
`Team Ranking` (e.g. `UK`) still count in the **individual** rankings (Golden Boot,
Playmaker, Rookie, Licence) — they just aren't part of a ranked team.

**Data hygiene** (nice to have, not blocking — the backend already coerces these):
- Formula errors (`#DIV/0!`, `#N/A`, `#REF!`) are read as `0`.
- GM columns should be **decimals** (`0.27`), not `27` or `"27%"`. As a safety net the
  backend treats any GM value **greater than `1.5` as a mis-entered percentage and divides
  it by 100** (so `27` → `0.27`). Caveat: a *genuine* GM at or above 150% (`1.5`) would be
  wrongly divided, and a bad value between `1.0`–`1.5` (e.g. `1.2` = 120%) is left as-is —
  so still prefer clean decimals at source. (Same rule lives in `apps_script_backend.gs`.)
- Empty rows are skipped.

---

## Optional tab: `Config` (only if you want to override defaults)

You do **not** need to create this. If absent, the backend uses sensible defaults baked
into `apps_script_backend.gs` (`SETTINGS`: password, period, dates). Create a `Config` tab
(columns `key` / `value`) only if you'd rather manage these from the sheet:

| key | value | description |
|-----|-------|-------------|
| `password` | `devoteam2026` | Access code (overrides the script default) |
| `last_update` | `2026-06-15T14:30:00Z` | ISO timestamp shown as "Last updated". **Best left blank** — the API then uses the spreadsheet's real last-edit time, which reflects actual data freshness. |
| `period` | `Week 3 of 5` | Header label |
| `challenge_start` | `2026-06-01` | |
| `challenge_end` | `2026-07-03` | |

> ⚠️ Do **not** use `=TEXT(NOW(),…)` for `last_update`: `NOW()` recalculates on every
> open/edit, so the timestamp would always look "fresh" even when no figures changed.
> Leave the cell blank (recommended) so the API reports the sheet's true last-edit time,
> or set a fixed ISO timestamp manually when you publish an update.

---

## Optional tab: `Special Awards`

For AI Play and Transformative Deal winners selected by jury panels. If absent, the
platform shows "To be selected after the challenge".

| key | name | team | description |
|-----|------|------|-------------|
| `ai_play_winner` | (winner name) | (their team) | Description of the AI deal |
| `transformative_deal_winner` | (winner name) | (their team) | Description of the deal |

---

## What changes for Jose's workflow

**Nothing.** Keep refreshing `Team Ranking` and `Challenge Ranking` from OneBI as usual.
The only thing to avoid is **renaming those tabs or their column headers** — that's what
the backend matches on.

If you ever rename a tab, update `SETTINGS.TEAMS_TAB` / `SETTINGS.PEOPLE_TAB` (and the
`headerRow`) at the top of `apps_script_backend.gs`, then redeploy.

---

*Spec v2 — adapted to the existing OneBI sheet (May 2026)*
