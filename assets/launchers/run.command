#!/bin/sh
# Double-clickable launcher for macOS Finder.
# Same as run.sh but with .command extension so Finder opens it in Terminal.
set -eu

DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$DIR/mhrv-rs"
UI="$DIR/mhrv-rs-ui"

if [ ! -x "$CLI" ]; then
    echo "error: $CLI not found or not executable"
    echo "Press return to close..."
    read _
    exit 1
fi

echo "Initializing MITM CA (you may be asked for your password)..."
"$CLI" --install-cert || echo "warning: CA install returned non-zero. The UI can still run."

if [ ! -x "$UI" ]; then
    echo "UI binary not found. Starting CLI proxy instead."
    exec "$CLI"
fi

echo "Starting mhrv-rs UI..."
"$UI"
