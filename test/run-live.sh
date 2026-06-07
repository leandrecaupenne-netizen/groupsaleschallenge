#!/usr/bin/env bash
# ============================================================================
# Live detector run — drives the UX detectors against the REAL Apps Script data.
# ----------------------------------------------------------------------------
# Fetches the live JSON from the Apps Script web app (following the one-shot
# redirect in a single curl pass), then runs both detectors with WC_DATA_FILE
# pointing at that payload so the app loads the real 32 teams / 377 people.
#
# Requires network access to script.googleusercontent.com (the host the /exec
# endpoint 302-redirects to). On Claude Code on the web this means the
# environment's network allowlist must include *.googleusercontent.com, which
# only takes effect in a freshly started session/container.
#
# Usage:  bash test/run-live.sh
# ========================================================================== */
set -euo pipefail

EXEC_URL="${WC_EXEC_URL:-https://script.google.com/macros/s/AKfycbydewCCd2LNmMKACluHC8PAqkzFxfK0u_jQrldoBEbjCyxycTPQjkQL4o-Hf-P_kDOq/exec}"
PW="${WC_PASSWORD:-devoteam2026}"
OUT="${WC_DATA_FILE:-/tmp/wc_live.json}"

echo "→ Fetching live data from Apps Script…"
curl -fsSL -m 60 "${EXEC_URL}?action=data&pw=${PW}" -o "$OUT"

# Fail fast if we got an error envelope or HTML instead of the data payload.
if ! node -e "const d=require('$OUT'); if(d.error) throw new Error(d.error); if(!Array.isArray(d.teams)||!Array.isArray(d.people)) throw new Error('unexpected shape'); console.log('  ok: '+d.teams.length+' teams / '+d.people.length+' people · updated '+d.updated_at);"; then
  echo "❌ Live fetch did not return valid data. First bytes:" >&2
  head -c 200 "$OUT" >&2; echo >&2
  exit 1
fi

export WC_DATA_FILE="$OUT"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"

echo "→ Running smoke detector on live data…"
node test/ux-smoke.cjs
echo "→ Running deep e2e detector on live data…"
node test/ux-e2e.cjs
echo "✅ Live detector run complete."
