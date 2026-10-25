#!/usr/bin/env bash
# Extension icons (DESIGN.md §7): renders tools/icons/*.svg with headless Chrome at 512 px,
# then downsamples with sips into public/icon/<size>.png, which WXT adds to the manifest.
set -euo pipefail
cd "$(dirname "$0")/../.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
OUT=public/icon
mkdir -p "$OUT"
render() {
  local svg="$1" png="$2"
  printf '<html><body style="margin:0"><img src="%s" width="512" height="512"></body></html>' \
    "file://$PWD/$svg" >"$WORK/page.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
    --user-data-dir="$WORK/profile" --allow-file-access-from-files \
    --default-background-color=00000000 --window-size=512,512 \
    --screenshot="$png" "file://$WORK/page.html" >/dev/null 2>&1
}
render tools/icons/mark.svg "$WORK/mark.png"
render tools/icons/mark-small.svg "$WORK/mark-small.png"
for size in 16 32; do sips -z $size $size "$WORK/mark-small.png" --out "$OUT/$size.png" >/dev/null; done
for size in 48 96 128; do sips -z $size $size "$WORK/mark.png" --out "$OUT/$size.png" >/dev/null; done
echo "Icons in $OUT"
