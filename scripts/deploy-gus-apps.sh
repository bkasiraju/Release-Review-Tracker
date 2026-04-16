#!/usr/bin/env bash
# Package manifest + backend + public and upload to gus-apps (uses sf GusProduction session).
set -euo pipefail
cd "$(dirname "$0")/.."
ZIP=$(mktemp -t cfs-release-review-XXXXXX.zip)
cleanup() { rm -f "$ZIP"; }
trap cleanup EXIT

zip -qr "$ZIP" manifest.json backend public -x "*.DS_Store"
TOKEN=$(sf org display --target-org GusProduction --json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('accessToken','') or '')")
if [[ -z "$TOKEN" ]]; then
  echo "No access token. Run: sf org login web -o GusProduction" >&2
  exit 1
fi

curl -sS -X POST "https://gus-apps.internal.salesforce.com/api/applets/deploy" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@${ZIP}"
echo
