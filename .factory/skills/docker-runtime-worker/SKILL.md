---
name: docker-runtime-worker
description: Repair and verify Cabinet Docker frontend packaging and runtime behavior with container-aware validation.
---

# Docker Runtime Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for Docker-specific frontend runtime, packaging, and deployment-surface fixes in Cabinet, especially when the containerized app on `localhost:3100` fails to boot, fails to serve static assets, or breaks the demo entry flow after image build/startup.

## Required Skills

- `test-driven-development` — invoke before implementation work so runtime fixes stay scoped and are backed by regression coverage where practical.
- `verification-before-completion` — invoke before claiming the feature is done.
- `agent-browser` — use for real browser verification against the Docker-served frontend on `http://localhost:3100`.

## Work Procedure

1. Read the feature description, linked validation assertions, `mission.md`, `AGENTS.md`, `.factory/services.yaml`, `.factory/library/architecture.md`, and `.factory/library/user-testing.md`.
2. Investigate the current Docker path before editing:
   - read `Dockerfile`, `docker-compose.yml`, and any scripts used by build/start paths
   - reproduce the failure on the actual containerized entrypoint at `http://localhost:3100`
   - identify whether the break is in image contents, standalone asset placement, runtime env wiring, or startup command assumptions
3. Invoke `test-driven-development` before changing files.
4. Add the smallest useful regression coverage first where practical. Prefer focused checks around packaging/runtime assumptions over broad new frameworks. If direct automated regression coverage is not practical for the container path, document why and compensate with stronger manual verification.
5. Implement the narrowest fix that restores the general Docker frontend runtime, not a login-only special case.
6. Rebuild and restart the Docker frontend using the repo’s defined container path, then verify:
   - container starts cleanly
   - `http://localhost:3100/login` renders styled UI
   - required `/_next/static/*` assets no longer 404
   - client interactivity works after hydration
7. Run relevant validators for touched files. At minimum, run the repo commands needed to prove the fix did not break build/runtime assumptions. For Docker packaging work, `npm run build` is expected unless the orchestrator explicitly says otherwise.
8. Manually verify the repaired Docker entry flow with `agent-browser`, capturing the exact URL, visible state, and any network/runtime observations.
9. Invoke `verification-before-completion` before ending the feature.
10. Return a thorough handoff with exact files changed, Docker/build commands run, browser checks, any regression coverage added, and any remaining deployment risks.

## Example Handoff

```json
{
  "salientSummary": "Fixed the standalone Docker packaging so the containerized Cabinet frontend on port 3100 now serves its static assets and hydrates normally. Rebuilt the image, restarted the container, and verified the login screen is styled and interactive in the browser.",
  "whatWasImplemented": "Updated the Docker packaging path so the Next standalone server has access to the required static asset directory at runtime, then rebuilt and restarted the demo container. Verified that the containerized frontend serves `/_next/static/*` successfully and that the real Docker login entrypoint remains usable after hydration.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "npm run build",
        "exitCode": 0,
        "observation": "Production build completed successfully with the packaging change."
      },
      {
        "command": "docker compose build cabinet",
        "exitCode": 0,
        "observation": "Rebuilt the Cabinet image with the updated runtime packaging."
      },
      {
        "command": "docker compose up -d cabinet",
        "exitCode": 0,
        "observation": "Recreated the demo container and confirmed it stayed running on port 3100."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened http://localhost:3100/login in the browser, watched network requests for `/_next/static/*`, typed into the password field, and confirmed the submit button state changed after hydration.",
        "observed": "The login page rendered with the expected styled layout, static assets loaded successfully, and client interactivity worked without console errors."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "test/docker-runtime.test.ts",
        "cases": [
          {
            "name": "standalone runtime expects static assets to be copied into the served location",
            "verifies": "Docker packaging regression does not drop required Next static assets"
          }
        ]
      }
    ]
  },
  "discoveredIssues": [
    {
      "severity": "low",
      "description": "The source-based dev instance on port 4000 still remains the preferred surface for day-to-day i18n editing, while Docker is now an additional packaging validation surface.",
      "suggestedFix": "Keep both validation surfaces documented in mission guidance."
    }
  ]
}
```

## When to Return to Orchestrator

- The Docker fix requires infrastructure or credential changes outside the repo-controlled container path.
- The container failure is caused by external host state the worker cannot repair safely.
- The runtime issue expands beyond frontend packaging into broader deployment architecture decisions.
- Rebuilding or replacing the running demo container would conflict with mission boundaries unless the orchestrator reprioritizes it.
