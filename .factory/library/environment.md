# Environment

Environment variables, external dependencies, and setup notes for this mission.

**What belongs here:** required runtime assumptions, external dependencies, and setup quirks.
**What does NOT belong here:** service ports/commands (use `.factory/services.yaml`).

---

## Runtime assumptions

- This mission is a front-end/client-state localization change in an existing Next.js application.
- No new third-party credentials are required.
- Existing repo dependencies are sufficient; standard install command is `npm install`.

## Important setup notes

- Do not rely on pre-existing running containers or historical app instances for validation.
- Start a fresh source-based dev app instance for this mission.
- Existing machine has multiple occupied ports; mission validation must avoid assuming `3000`, `3001`, or `3100` are available.

## Worktree isolation

- Repository already has unrelated uncommitted changes.
- Mission work must remain isolated to i18n-related files plus `PROGRESS.md`.
