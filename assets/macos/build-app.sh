#!/bin/sh
# Bundle the mhrv-rs-ui binary into a macOS .app.
# Usage: build-app.sh <ui-binary> <version> <output-dir>
set -eu

BIN="$1"
VER="$2"
OUT_DIR="$3"

APP="$OUT_DIR/mhrv-rs.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"

cp "$BIN" "$APP/Contents/MacOS/mhrv-rs-ui"
chmod +x "$APP/Contents/MacOS/mhrv-rs-ui"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
sed "s/__VERSION__/$VER/g" "$SCRIPT_DIR/Info.plist" > "$APP/Contents/Info.plist"

echo "Built $APP"
