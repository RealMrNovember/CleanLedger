#!/usr/bin/env bash
# CleanLedger Windows desktop installer build (Tauri v2)
# Requires: Node 20+, Rust stable, NSIS (for .exe installer), WiX optional (.msi)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies"
npm ci

echo "==> Shared tests"
npm run test:shared

echo "==> Desktop frontend build"
npm run build -w cleanledger-desktop

echo "==> Tauri Windows bundle (NSIS + MSI)"
cd apps/desktop
npm run tauri:build

echo "==> Artifacts:"
find src-tauri/target/release/bundle -maxdepth 3 -type f \( -name '*.exe' -o -name '*.msi' -o -name '*.nsis.zip' \) 2>/dev/null || true
