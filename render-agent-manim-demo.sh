#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
image="${MANIM_DOCKER_IMAGE:-y2k-backend-manim:latest}"
scene_file="${1:-backend/videos/agent_sandbox/agent_demo.py}"
scene_name="${2:-AgentSandboxDemo}"

shift_count=0
if [ "$#" -ge 1 ]; then
  shift_count=1
fi
if [ "$#" -ge 2 ]; then
  shift_count=2
fi
shift "$shift_count"

render_flags=("$@")
if [ "${#render_flags[@]}" -eq 0 ]; then
  render_flags=("-l")
fi

if ! docker image inspect "$image" >/dev/null 2>&1; then
  docker build -t "$image" "$repo_root/backend"
fi

docker run --rm \
  -v "$repo_root:/workspace" \
  "$image" \
  manimgl "/workspace/$scene_file" "$scene_name" \
  --config_file /workspace/backend/videos/agent_sandbox/custom_config.yml \
  -w \
  "${render_flags[@]}"
