#!/bin/sh
# mhrv-rs launcher for Linux / macOS.
# Runs the CLI once (initializes the MITM CA in the user data dir and installs
# it into the system trust store; may prompt for sudo), then launches the UI.
set -eu

DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$DIR/mhrv-rs"
UI="$DIR/mhrv-rs-ui"

if [ ! -x "$CLI" ]; then
    echo "error: $CLI not found or not executable" >&2
    exit 1
fi

echo "Initializing MITM CA (you may be asked for your password)..."
"$CLI" --install-cert || echo "warning: CA install returned non-zero; the UI can still run, but HTTPS sites may show cert errors until the CA is trusted."

if [ ! -x "$UI" ]; then
    echo "UI binary not found. Starting CLI proxy instead."
    exec "$CLI"
fi

echo "Starting mhrv-rs UI..."
exec "$UI"
