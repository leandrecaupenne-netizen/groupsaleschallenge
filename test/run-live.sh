#!/usr/bin/env bash
#
# run-live.sh — live smoke test for the Devoteam World Cup platform back-end.
#
# Exercises the deployed Google Apps Script web app exactly the way index.html
# does, and checks the live payload's shape and integrity. Use it before sharing
# the URL, after redeploying the Apps Script, or to debug "Failed to load data".
#
# Usage:
#   test/run-live.sh                      # uses defaults below
#   APPS_SCRIPT_URL=... PASSWORD=... test/run-live.sh
#
# Env overrides:
#   APPS_SCRIPT_URL   deployed /exec URL (default: the one wired into index.html)
#   PASSWORD          access code        (default: devoteam2026)
#   EXPECT_TEAMS      expected team count, set empty to skip (default: 32)
#   MIN_PEOPLE        minimum people count                  (default: 300)
#
# Exit code 0 = all checks passed, non-zero = at least one failed.
# Requires: curl, python3.

set -u

APPS_SCRIPT_URL="${APPS_SCRIPT_URL:-https://script.google.com/macros/s/AKfycbydewCCd2LNmMKACluHC8PAqkzFxfK0u_jQrldoBEbjCyxycTPQjkQL4o-Hf-P_kDOq/exec}"
PASSWORD="${PASSWORD:-devoteam2026}"
EXPECT_TEAMS="${EXPECT_TEAMS-32}"
MIN_PEOPLE="${MIN_PEOPLE:-300}"
TIMEOUT=60

pass=0
fail=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; pass=$((pass+1)); }
ko()   { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=$((fail+1)); }
info() { printf '\n\033[1m%s\033[0m\n' "$1"; }

for bin in curl python3; do
  command -v "$bin" >/dev/null 2>&1 || { echo "missing dependency: $bin" >&2; exit 2; }
done

echo "Target: $APPS_SCRIPT_URL"

# 1) Connectivity ------------------------------------------------------------
info "1. Connectivity (GET ?action=ping)"
ping_body="$(curl -sS -L --max-time "$TIMEOUT" "$APPS_SCRIPT_URL?action=ping" 2>/dev/null)"
if echo "$ping_body" | python3 -c 'import sys,json; sys.exit(0 if json.load(sys.stdin).get("ok") is True else 1)' 2>/dev/null; then
  ok "ping returned ok:true"
else
  ko "ping failed — back-end unreachable or not deployed: $ping_body"
  echo; echo "Aborting: cannot reach back-end."; exit 1
fi

# 2) Wrong password is rejected ---------------------------------------------
info "2. Auth — wrong password is rejected"
bad_body="$(curl -sS -L --max-time "$TIMEOUT" "$APPS_SCRIPT_URL" \
  -H 'Content-Type: text/plain;charset=utf-8' \
  --data '{"action":"data","password":"definitely-wrong"}' 2>/dev/null)"
if echo "$bad_body" | python3 -c 'import sys,json; sys.exit(0 if json.load(sys.stdin).get("error")=="unauthorized" else 1)' 2>/dev/null; then
  ok "wrong password → {\"error\":\"unauthorized\"}"
else
  ko "wrong password was NOT rejected: $bad_body"
fi

# 3) Correct password returns the live payload ------------------------------
info "3. Data — correct password returns the live payload"
data_file="$(mktemp)"
trap 'rm -f "$data_file"' EXIT
curl -sS -L --max-time "$TIMEOUT" "$APPS_SCRIPT_URL" \
  -H 'Content-Type: text/plain;charset=utf-8' \
  --data "$(PASSWORD="$PASSWORD" python3 -c 'import os,json;print(json.dumps({"action":"data","password":os.environ["PASSWORD"]}))')" \
  -o "$data_file" 2>/dev/null

EXPECT_TEAMS="$EXPECT_TEAMS" MIN_PEOPLE="$MIN_PEOPLE" python3 - "$data_file" <<'PY'
import json, os, sys

reset="\033[0m"; grn="\033[32m"; red="\033[31m"; yel="\033[33m"
def ok(m):  print(f"  {grn}✓{reset} {m}")
def ko(m):  print(f"  {red}✗{reset} {m}"); fails.append(m)
def warn(m):print(f"  {yel}!{reset} {m}")
fails=[]

path=sys.argv[1]
try:
    d=json.load(open(path))
except Exception as e:
    print(f"  {red}✗{reset} response is not valid JSON: {e}")
    sys.exit(1)

if d.get("error"):
    print(f"  {red}✗{reset} back-end returned error: {d['error']} (hint: {d.get('hint')})")
    sys.exit(1)

# Required top-level keys
required={"teams","people","updated_at","period","challenge_dates","special_awards"}
missing=required-set(d)
ok("all required top-level keys present") if not missing else ko(f"missing top-level keys: {sorted(missing)}")

teams=d.get("teams"); people=d.get("people")
ok("teams is a non-empty array") if isinstance(teams,list) and teams else ko("teams is missing/empty")
ok("people is a non-empty array") if isinstance(people,list) and people else ko("people is missing/empty")

# Counts
expect_teams=os.environ.get("EXPECT_TEAMS","").strip()
if expect_teams:
    n=len(teams or [])
    ok(f"team count = {n} (expected {expect_teams})") if str(n)==expect_teams else ko(f"team count = {n}, expected {expect_teams}")
min_people=int(os.environ.get("MIN_PEOPLE","0") or 0)
np=len(people or [])
ok(f"people count = {np} (>= {min_people})") if np>=min_people else ko(f"people count = {np}, expected >= {min_people}")

# Excluded teams must not leak
excluded={"MOROCCO","SERBIA","TUNISIA"}
leak=sorted({t.get("country","") for t in (teams or []) if str(t.get("country","")).upper() in excluded})
ok("excluded teams (Morocco/Serbia/Tunisia) are filtered out") if not leak else ko(f"excluded teams leaking: {leak}")

# Schema spot-checks
team_keys={"country","members","total_ps","avg_ps","avg_gm","avg_meetings","avg_opps"}
if teams:
    tm=team_keys-set(teams[0])
    ok("team objects have the expected fields") if not tm else ko(f"team object missing fields: {sorted(tm)}")
people_keys={"name","team","tenure","ps_total","ps_nb","meetings","opps","is_rookie","yellow_meetings"}
if people:
    pm=people_keys-set(people[0])
    ok("people objects have the expected fields") if not pm else ko(f"people object missing fields: {sorted(pm)}")

# Referential integrity: every person's team exists in teams.
# Orphans are an upstream-data gap (a team present in Challenge Ranking but missing
# from Team Ranking), not a platform bug — those people still rank in Golden Boot /
# Playmaker / My Position, they just have no team to drill into. So: warn, don't fail.
if teams and people:
    countries={t.get("country") for t in teams}
    from collections import Counter
    orphan_counts=Counter(p.get("team") for p in people if p.get("team") not in countries)
    if not orphan_counts:
        ok("every person maps to a known team")
    else:
        detail=", ".join(f"{k or '<blank>'} ({n})" for k,n in orphan_counts.most_common())
        warn(f"people on teams missing from Team Ranking: {detail}")

# Echo the context the header shows
print(f"\n  updated_at : {d.get('updated_at')}")
print(f"  period     : {d.get('period')}")
print(f"  dates      : {d.get('challenge_dates')}")
print(f"  awards     : {'set' if d.get('special_awards') else 'none (placeholder)'}")
w=d.get("warnings")
if w: print(f"  {red}warnings   : {w}{reset}")

sys.exit(1 if fails else 0)
PY
data_rc=$?
[ "$data_rc" -eq 0 ] && pass=$((pass+1)) || fail=$((fail+1))

# Summary --------------------------------------------------------------------
info "Summary"
echo "  passed: $pass   failed: $fail"
[ "$fail" -eq 0 ] && { echo; echo "ALL LIVE CHECKS PASSED"; exit 0; }
echo; echo "LIVE CHECKS FAILED"; exit 1
