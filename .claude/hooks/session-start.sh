#!/bin/bash
# SessionStart hook — Claude Code on the web.
# Installs the npm dev dependency (@playwright/test) and the Playwright browser
# binaries so the E2E suite (tests/) can actually run in a web session.
#
# Idempotent and non-interactive: safe to re-run; the container caches its state
# after the hook completes, so only the first session pays the install cost.
set -euo pipefail

# Web (remote) sessions only — a local terminal already has its own setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "[session-start] Installing npm dependencies…"
npm install

# Playwright fetches its browsers from cdn.playwright.dev. That host must be in
# the environment's network allowlist (Network access → Custom → Allowed domains).
# If it isn't, the download 403s — we keep the session usable instead of failing
# the whole hook, and print how to fix it.
echo "[session-start] Installing Playwright browsers (chromium, firefox, webkit)…"
# Preferred: browsers + system libs via apt (--with-deps). In this sandbox apt
# can fail on unrelated third-party PPAs, so we fall back to a browsers-only
# download (that path needs only cdn.playwright.dev, no apt).
if npx --no-install playwright install --with-deps chromium firefox webkit; then
  echo "[session-start] Playwright browsers + system deps ready — run: npm test"
elif npx --no-install playwright install chromium firefox webkit; then
  echo "[session-start] Browsers downloaded (without apt system deps) — run: npm test"
  echo "[session-start]   If a browser fails to launch, a few OS libs may be missing."
else
  echo "[session-start] WARNING: browser download failed."
  echo "[session-start]   Add 'cdn.playwright.dev' to the environment's Custom network allowlist,"
  echo "[session-start]   then start a new session. Until then: 'npx playwright test --list' still works."
fi
