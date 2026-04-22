#!/usr/bin/env bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/runtime-root}"

mkdir -p "$XDG_RUNTIME_DIR" /tmp/.X11-unix
chmod 700 "$XDG_RUNTIME_DIR"

display_number="${DISPLAY#:}"
display_number="${display_number%%.*}"
x_socket="/tmp/.X11-unix/X${display_number}"

if [ ! -S "$x_socket" ]; then
  Xvfb "$DISPLAY" -screen 0 1920x1080x24 -ac +extension GLX +render -noreset >/tmp/xvfb.log 2>&1 &

  for _ in {1..50}; do
    if [ -S "$x_socket" ]; then
      break
    fi
    sleep 0.1
  done
fi

if [ ! -S "$x_socket" ]; then
  printf 'Xvfb failed to start for DISPLAY=%s\n' "$DISPLAY" >&2
  exit 1
fi

exec "$@"
