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
