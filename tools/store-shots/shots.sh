#!/usr/bin/env bash
# Store screenshots (docs/store/LISTING.md): built popup/report pages with stubbed extension APIs
# and synthetic data, captured by headless Chrome at 1280x800. Not shipped.
set -euo pipefail
cd "$(dirname "$0")/../.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
WORK="$(mktemp -d)"
OUT=docs/store/screenshots
cp -R .output/chrome-mv3 "$WORK/site"
cp tools/store-shots/stub.js "$WORK/site/stub.js"
for page in popup report; do
  sed -i.bak 's#<head>#<head><script src="/stub.js"></script>#' "$WORK/site/$page.html"
done
python3 -m http.server 8765 --directory "$WORK/site" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER; rm -rf "$WORK"' EXIT
sleep 1
Q="tab=7&origin=https%3A%2F%2Fshop.example.com"
mkdir -p "$OUT"
for lang in en id; do
  for spec in "1 popup" "2 popup" "3 popup" "4 report" "5 report"; do
    set -- $spec
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
      --user-data-dir="$WORK/profile" --window-size=1280,800 --virtual-time-budget=5000 \
      --screenshot="$OUT/$lang-$1-$2.png" "http://localhost:8765/$2.html?shot=$1&lang=$lang&$Q" >/dev/null 2>&1
  done
done
echo "Screenshots in $OUT"
