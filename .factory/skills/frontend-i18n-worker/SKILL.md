---
name: frontend-i18n-worker
description: Implement strict demo-scope UI localization features for Cabinet core surfaces using TDD and browser-aware verification.
---

# Frontend i18n Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for demo-scope UI localization features in the Cabinet web app: i18n infrastructure, locale persistence, header switcher, and covered-copy updates in login, home, sidebar, editor, Agents, Tasks, and Settings.

## Required Skills

- `test-driven-development` — invoke before implementation work to keep changes red/green and scoped.
- `verification-before-completion` — invoke before claiming the feature is done.
- `agent-browser` — use when manual browser verification is required for visible UI behavior.

## Work Procedure

1. Read the feature description, linked validation assertions, `mission.md`, `AGENTS.md`, `.factory/library/architecture.md`, and `.factory/library/user-testing.md`.
2. Invoke `test-driven-development` before editing files.
3. Identify the smallest affected files and add or update tests first where practical. If no direct UI test exists for the surface, document that and rely on strong manual verification for the visible behavior.
   - In this repo, prefer extending the current focused regression files (for example `test/i18n-core.test.ts` and `test/settings-i18n.test.ts`) rather than inventing new paths unless the surface truly needs a new test file.
   - For tiny compiler-only regressions where existing regression coverage already exercises the touched surface, compiler-first verification with `npx tsc --noEmit` is acceptable if you document why strict red/green TDD would not add signal.
4. Implement only the scoped feature behavior. Keep changes limited to i18n-related files and the requested covered surfaces.
5. Verify fallback behavior carefully: missing covered-surface translations must fall back to English without blank UI or runtime errors.
6. Run targeted validation while iterating, then run mission commands as relevant: `npm run lint`, `npx tsc --noEmit`, and `npm test`. Run `npm run build` only when the feature description or orchestrator guidance requires it.
7. Manually verify the affected UI path with `agent-browser` when the feature changes visible browser behavior. Capture the exact path exercised and what changed.
8. Invoke `verification-before-completion` before ending the feature.
9. Return a thorough handoff with exact files changed, commands run, interactive checks performed, tests added or updated, and any discovered gaps.

## Example Handoff

```json
{
  "salientSummary": "Added the demo i18n store, header language switcher, and localized the login and home surfaces. Verified zh default, en switching, and refresh persistence in the browser.",
  "whatWasImplemented": "Created a lightweight client-side i18n layer with zh/en dictionaries and English fallback, mounted it in the app layout, added a language switcher beside the theme control, and updated login/home shell copy to use translation keys while preserving existing UI structure.",
  "whatWasLeftUndone": "Agents, Tasks, and Settings copy are still pending in later features.",
  "verification": {
    "commandsRun": [
      {
        "command": "npm run lint",
        "exitCode": 0,
        "observation": "Lint passed after updating localized client components."
      },
      {
        "command": "npx tsc --noEmit",
        "exitCode": 0,
        "observation": "TypeScript passed with the new locale types and provider wiring."
      },
      {
        "command": "npm test",
        "exitCode": 0,
        "observation": "Existing node-based test suite stayed green."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened login and home in the browser, confirmed default zh copy, switched to en from the header, refreshed the page, and confirmed the selection persisted.",
        "observed": "Covered labels changed immediately and persisted after refresh; no blank labels or runtime errors appeared."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/lib/i18n/i18n.test.ts",
        "cases": [
          {
            "name": "falls back to English when zh translation is missing",
            "verifies": "covered-surface missing translations do not produce blank UI"
          }
        ]
      }
    ]
  },
  "discoveredIssues": [
    {
      "severity": "medium",
      "description": "Agents workspace contains additional deep-dialog strings outside demo scope that remain English.",
      "suggestedFix": "Leave out of scope unless the demo path expands."
    }
  ]
}
```

## When to Return to Orchestrator

- The feature requires broader product wording decisions beyond the approved demo scope.
- A covered surface depends on unrelated broken runtime state that prevents browser validation.
- The required locale behavior would force changes outside the agreed scope (for example route-level i18n or backend translation loading).
- Existing unrelated worktree changes block safe editing of the target files.
