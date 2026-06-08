#!/usr/bin/env python3
"""Capture a weekly history snapshot from a fetched API payload.

Usage:
    python3 scripts/snapshot.py <live.json> [out_dir]

Reads the raw API JSON (already fetched, e.g. by curl), trims it to the fields that
drive every board, and writes history/<UTC-date>.json. Exits non-zero if the payload
looks wrong (e.g. unauthorized / empty) so the scheduled job fails loudly instead of
committing an empty snapshot. Ranks are derived at read time, not stored.
"""
import json, sys, os, datetime

src = sys.argv[1] if len(sys.argv) > 1 else "/tmp/live.json"
out_dir = sys.argv[2] if len(sys.argv) > 2 else "history"

try:
    d = json.load(open(src, encoding="utf-8"))
except Exception as e:
    print(f"::error::could not read/parse {src}: {e}")
    sys.exit(1)

if d.get("error"):
    print(f"::error::API returned an error ({d.get('error')}). Is the APP_PASSWORD secret set correctly?")
    sys.exit(1)

teams = d.get("teams") or []
people = [p for p in (d.get("people") or []) if p.get("name")]
if len(teams) < 10 or len(people) < 100:
    print(f"::error::payload looks wrong (teams={len(teams)}, people={len(people)}) — refusing to snapshot")
    sys.exit(1)

def num(x):
    try:
        return round(float(x or 0), 2)
    except Exception:
        return 0

snap = {
    "date": datetime.date.today().isoformat(),
    "captured_at": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "period": d.get("period"),
    "sheet_updated_at": d.get("updated_at"),
    "teams": [
        {"country": t.get("country"), "members": t.get("members"),
         "total_ps": num(t.get("total_ps")), "avg_ps": num(t.get("avg_ps")),
         "avg_gm": num(t.get("avg_gm")), "avg_opps": num(t.get("avg_opps")),
         "avg_meetings": num(t.get("avg_meetings"))}
        for t in teams
    ],
    "people": [
        {"name": p.get("name"), "team": p.get("team"),
         "ps_total": num(p.get("ps_total")), "ps_nb": num(p.get("ps_nb")),
         "opps": int(num(p.get("opps"))), "ps_total_gm": num(p.get("ps_total_gm")),
         "meetings": num(p.get("meetings")), "licence_gm": num(p.get("licence_gm")),
         "is_rookie": bool(p.get("is_rookie"))}
        for p in people
    ],
}

os.makedirs(out_dir, exist_ok=True)
fn = os.path.join(out_dir, f"{snap['date']}.json")
with open(fn, "w", encoding="utf-8") as f:
    json.dump(snap, f, ensure_ascii=False, separators=(",", ":"))

print(f"wrote {fn} · {snap['period']} · teams={len(snap['teams'])} people={len(snap['people'])}")
