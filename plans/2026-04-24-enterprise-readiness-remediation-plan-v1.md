# Enterprise Readiness Remediation Plan v1

## Objective

Bring the current multi-user Cabinet work from "enterprise-shaped" to production-usable for a 5-50 person self-hosted team.

The immediate priority is not more UI. The priority is closing the authorization, cabinet ownership, AI context access, and local execution gaps that still behave like a single-user personal assistant.

## Current Risk Summary

1. Production authorization has company/cabinet abstractions, but no default production membership or resource-mapping provider.
2. Several control-plane APIs are protected by login middleware only, not by role or cabinet-scoped authorization.
3. Agent conversations can read mentioned KB pages directly, bypassing the normal page authorization path.
4. Tree/search visibility still mostly follows private-owner metadata rather than company/cabinet membership.
5. Path normalization accepts too much untrusted input for a team deployment.
6. Local agent CLI execution still defaults to high-trust single-user assumptions.
7. Runtime conversation and task data pollutes the git worktree and makes collaboration noisy.

## Implementation Units

### Unit 1: Production Membership and Cabinet Mapping

- Add a file-backed membership runtime under `src/lib/auth/`.
- Support explicit config at `data/.agents/.config/memberships.json`.
- When explicit config is absent, map legacy global roles as a compatibility fallback:
  - `admin` -> company admin and cabinet admin
  - `editor` -> company member and cabinet editor
  - `viewer` -> company member and cabinet viewer
- Resolve page/resource ownership through the nearest `.cabinet` manifest.
- Preserve test override hooks in `src/lib/auth/page-authorization.ts`.

### Unit 2: Control Plane Authorization Sweep

- Add shared route guard helpers.
- Apply admin or cabinet-management authorization to provider settings, agent management, scheduler, jobs, system update/open/reveal, and headless execution routes.
- Keep read-only status endpoints usable by authenticated users only when they do not expose sensitive configuration.

### Unit 3: Agent Context Authorization

- Require page authorization before adding `pagePath` or `mentionedPaths` content to prompts.
- Deny manual/editor conversation creation if any referenced page is not readable by the actor.
- Restrict headless workdir to authorized cabinet scope.

### Unit 4: Tree/Search/Cabinet Visibility

- Filter tree/search results through the same company/cabinet authorization model.
- Preserve existing private-owner filtering as an additional rule, not the only rule.
- Ensure cabinet overview and conversation lists do not leak sibling cabinet data.

### Unit 5: Path and Execution Hardening

- Harden `resolveContentPath` and `normalizeCabinetPath` against `..`, absolute paths, and prefix-confusion traversal.
- Validate persona/job/workdir values before joining them to `DATA_DIR`.
- Add audit metadata for agent runs and keep dangerous CLI flags configurable for future enterprise mode.

### Unit 6: Runtime Data Cleanup

- Stop tracking newly generated conversation, history, and task runtime files.
- Keep seed/demo content reproducible without requiring live runtime output in git.

## Verification

- `node --import tsx --test test/page-authorization.test.ts`
- `node --import tsx --test test/path-isolation.test.ts test/agent-context-authorization.test.ts test/api-authorization.test.ts`
- `node --import tsx --test test/*.test.ts`
- `npm run build`

## Scope Boundaries

- Keep file-backed storage for this pass.
- Do not introduce external identity providers.
- Do not redesign reporting UI until production membership and resource mapping are connected.
- Do not attempt full audit-log productization in this pass; add minimal metadata and seams for follow-up.
