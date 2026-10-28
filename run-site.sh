#!/usr/bin/env bash
# Start de lokale app op http://127.0.0.1:4173
set -euo pipefail
cd "$(dirname "$0")"
python3 -m http.server 4173 --bind 127.0.0.1
