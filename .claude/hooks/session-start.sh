#!/bin/bash
# SessionStart hook — Claude Code on the web.
# Makes the headless UX tests runnable in a fresh web-session container by
# installing Playwright + Chromium. Matches the repo's convention: NO root
# package.json (the static Vercel deploy stays dependency-free), so we install
# Playwright GLOBALLY — exactly what test/ux-*.cjs resolves via its
# `require('npm root -g'/playwright)` fallback.
#
# Idempotent, non-interactive, and never fails the session: if the browser
# download is blocked (cdn.playwright.dev not allowlisted) it warns and exits 0.
set -euo pipefail

# Web (remote) sessions only — a local terminal already has its own setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Pin to the version the CI (ux-tests.yml) uses, for reproducible behaviour.
PW_VERSION="1.56.1"

# Already installed globally? Skip the network round-trip.
if node -e "require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')" >/dev/null 2>&1; then
  echo "[session-start] Playwright already present globally — skipping npm install."
else
  echo "[session-start] Installing Playwright ${PW_VERSION} globally…"
  npm install -g "playwright@${PW_VERSION}"
fi

# Browsers download from cdn.playwright.dev. Prefer system deps via apt
# (--with-deps); apt can 403 on unrelated third-party PPAs in this sandbox, so
# fall back to a browsers-only download (that path needs only cdn.playwright.dev).
echo "[session-start] Installing Chromium for Playwright…"
if playwright install --with-deps chromium; then
  echo "[session-start] Chromium + system deps ready — run: node test/ux-smoke.cjs"
elif playwright install chromium; then
  echo "[session-start] Chromium downloaded (without apt system deps) — run: node test/ux-smoke.cjs"
  echo "[session-start]   If it fails to launch, a few OS libs may be missing."
else
  echo "[session-start] WARNING: Chromium download failed."
  echo "[session-start]   Add 'cdn.playwright.dev' to the environment's Custom network allowlist"
  echo "[session-start]   (or use Full), then start a NEW session."
fi
