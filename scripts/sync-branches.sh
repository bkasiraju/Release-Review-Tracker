#!/usr/bin/env bash
# Point local master at main (same as CI does on GitHub after each main push).
set -euo pipefail
cd "$(dirname "$0")/.."
git branch -f master main
echo "master -> $(git rev-parse --short master) (matches main)"
