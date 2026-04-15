#!/usr/bin/env bash
# Local dashboard + GUS API — same as: python3 server.py
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 server.py
