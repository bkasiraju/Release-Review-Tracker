#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or later is needed for the local preview."
  read -r "?Press Enter to close."
  exit 1
fi
open "http://localhost:8383"
node server.js --demo
