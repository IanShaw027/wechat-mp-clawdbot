# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the plugin implementation. Core entrypoints live in `src/channel.ts`, `src/webhook.ts`, and `src/runtime.ts`; config and types are in `src/config*.ts` and `src/types.ts`; feature toggles live under `src/features/`; knowledge providers live under `src/knowledge/`. `templates/` stores scaffolded markdown for the generated `wemp-kf` agent. `docs/` holds design notes, implementation plans, and review records. `openclaw.plugin.json` defines plugin metadata.

## Build, Test, and Development Commands
This repository does not currently include a checked-in `package.json` or Makefile, so keep commands aligned with the parent OpenClaw workspace.

- `tsc --noEmit`: type-check the plugin sources before submitting changes.
- `tsc --noEmit --pretty false`: CI-friendly type check.
- `rg "TODO|FIXME" src docs`: scan for unfinished work before review.

If the parent workspace provides a plugin loader or local gateway, use that environment to validate webhook registration and outbound delivery.

## Coding Style & Naming Conventions
Write TypeScript as ES modules with explicit `.js` import suffixes, matching files such as [src/channel.ts](/root/clawd/projects/wemp-v2/src/channel.ts). Use 2-space indentation, trailing semicolons, and double quotes. Prefer small pure helpers for parsing, routing, and config normalization. File names are kebab-case or concise nouns (`webhook.ts`, `usage-limit.ts`); exported types and interfaces use `PascalCase`; functions and variables use `camelCase`.

## Testing Guidelines
Automated tests are not wired yet; add them with any behavior change that touches routing, crypto, deduplication, or provider fallback. Place tests beside the module or under a future `test/` directory using `*.test.ts`. At minimum, verify signature handling, paired vs. unpaired routing, duplicate suppression, and feature-flag defaults. Always run `tsc --noEmit` before opening a PR.

## Commit & Pull Request Guidelines
The repository currently has no local commit history, so start with clear imperative commits such as `feat: add encrypted reply handling` or `fix: guard duplicate webhook delivery`. Keep each commit focused. PRs should include a short problem statement, the changed flow or modules, validation steps, and sample payloads or screenshots when webhook behavior changes.

## Security & Configuration Notes
Never commit real `appSecret`, API keys, or live webhook tokens. Keep examples scrubbed, and preserve the non-destructive scaffold behavior: onboarding should add missing files without overwriting user-maintained content.
