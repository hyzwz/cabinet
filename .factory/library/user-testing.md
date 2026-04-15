# User Testing

Testing surface, tooling, and validation guidance for this mission.

**What belongs here:** browser-visible validation surfaces, setup guidance, and concurrency/resource notes.

---

## Validation Surface

Primary surface: browser UI for the Cabinet source app.

Main demo path to validate:
1. Login
2. Home
3. Sidebar navigation
4. Open page into editor
5. Agents main workspace
6. Tasks main board / schedule entry
7. Settings top-level page

Required behaviors:
- default locale is `zh`
- visible language switcher near theme control
- switching updates covered copy immediately
- refresh preserves locale
- uncovered or untranslated content fails safely with English fallback

Preferred tool: `agent-browser` via the mission user-testing validator.
Fallback support checks: HTTP health checks for app/daemon readiness.

## Validation Concurrency

Host capacity observed during planning: 12 CPU cores, 32 GiB RAM.

Recommended max concurrent validators for browser surface: 3.
Rationale:
- enough headroom for one source app instance, optional daemon, and multiple browser sessions
- avoids unnecessary contention on an already busy developer machine with many active services
- conservative cap aligns with the dry-run result (`runnable with limits`)

Recommended max concurrent validators for lightweight HTTP checks: 5.

## Validation Notes

- Do not validate against pre-existing containerized instances.
- Use a fresh source app instance for this mission.
- If daemon-backed UI regions need health, run a fresh source daemon instance as well.
- Because existing repo has little to no UI automation coverage, browser validation is the primary acceptance path.


## Docker demo frontend

- Additional validation surface: the real demo frontend served from Docker at `http://localhost:3100`.
- Use this surface for packaging/runtime assertions, especially styled login rendering, successful `/_next/static/*` asset delivery, and post-hydration login interactivity.
- Keep source-instance checks for implementation iteration, but do not declare the demo healthy without verifying the Docker surface.
