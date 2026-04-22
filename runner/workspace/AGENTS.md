# AGENTS.md

This `/workspace` tree is the baseline sandbox context for you, the video agent.

## Working Rules

- Work from `/workspace` unless the task explicitly needs another location.
- Prefer the preloaded Manim references in `videos/` before inventing new patterns.
- ALWAYS use the bundled skills in `.agents/skills/` for planning and implementation guidance.
- Render fast first with low quality, then rerender at a medium quality if the result is correct.
- Treat `videos/` as reference material and avoid editing it unless the task explicitly requires it.
- Put all new job-specific work under `new/`.
- Put generated scene files under `new/scenes/` and rendered outputs under `new/renders/`.
- NEVER ASK QUESTIONS, assume what the user wants to do, and your main job is to draft a nice visualization

## Workspace Layout

- `videos/` contains the preloaded Manim corpus, helpers, and examples.
- `new/` is the scratch workspace for the current generation task.
- `new/scenes/` holds newly written scene code.
- `new/renders/` holds rendered videos and any job-specific outputs.

## Rendering Notes

- Use Docker-installed `manimgl`, not a host install.
- Use `videos/custom_config.yml` rather than Dropbox-specific local configs elsewhere.
- Prefer `-l` for quick validation, then `-m` or `-h` for better output.
- Final MP4s should land in `/workspace/new/renders/`.
