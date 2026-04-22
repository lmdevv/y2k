# Runner

This directory holds the Daytona-oriented runtime assets and helpers.

- `Dockerfile`: headless ManimGL sandbox image.
- `docker-entrypoint.sh`: boots Xvfb for headless rendering.
- `render-agent-manim-demo.sh`: local smoke test for the sandbox image.
- `workspace/`: seeded sandbox filesystem baked into Daytona snapshots.

`workspace/` is the source of truth for what the Daytona sandbox should look like at boot:

- `.agents/skills/manim-composer/`
- `.agents/skills/manimgl-best-practices/`
- `videos/` reference corpus
- `renders/` output directory for generated artifacts
- top-level sandbox `AGENTS.md`

Build the Daytona image from `runner/`, then create or refresh a snapshot from that image whenever you change either the runtime dependencies or the seeded workspace.

## Repo Workflow

The frontend package now includes two helper scripts that treat `runner/` as the source of truth for the Daytona environment:

- `npm run daytona:snapshot` builds or reuses the `DAYTONA_RUNNER_SNAPSHOT` snapshot from `runner/Dockerfile`
- `npm run daytona:smoke` creates a sandbox from that snapshot, verifies `opencode`, `manimgl`, and the seeded `/workspace` tree, then starts `opencode serve`

Runtime integration should go through Convex actions, not the browser directly. The repo now includes `frontend/convex/daytona.ts` as the server-side Daytona entrypoint, so client code can call Convex and Convex can create or delete Daytona sandboxes using server-only credentials.

Expected server-side environment variables:

- `DAYTONA_API_KEY`
- `DAYTONA_API_URL`
- `DAYTONA_RUNNER_SNAPSHOT` optional, defaults to `y2k-runner`
- `DAYTONA_RUNNER_CPU` optional, defaults to `2`
- `DAYTONA_RUNNER_MEMORY` optional, defaults to `4`
- `DAYTONA_RUNNER_DISK` optional, defaults to `8`

Optional OpenCode vars forwarded into each sandbox:

- `ZEN_API_KEY`
- `OPENCODE_CONFIG`
- `OPENCODE_CONFIG_CONTENT`
- `OPENCODE_MODEL`
