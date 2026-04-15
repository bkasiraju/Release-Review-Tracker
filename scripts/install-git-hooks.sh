#!/usr/bin/env bash
# One-time per clone: use repo .githooks so post-commit / pre-push keep master in sync with main.
set -euo pipefail
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
echo "core.hooksPath=.githooks (local master sync + pre-push guard)"
