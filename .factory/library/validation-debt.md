# Validation Debt

Known validation hazards and baseline repo issues that workers should treat as pre-existing unless their assigned feature explicitly targets them.

## Current known debt

- `npm test` currently has a pre-existing machine-specific failure in `test/conversation-output-cleaning.test.ts`: one assertion expects the absolute path `/Users/mybiblepath/Development/cabinet/data/hilas-cabinet`, which fails in this workspace where the actual path is `/Users/murunkun/MeishuSourceCode/cabinet/data/hilas-cabinet`.
- `npm run lint` currently fails on unrelated repo-wide lint errors outside the demo i18n milestone scope, including issues in `server/terminal-server.ts`, `src/components/agents/agent-detail.tsx`, `src/components/cabinets/agent-status-grid.tsx`, `src/components/composer/composer-input.tsx`, `src/components/mission-control/slack-panel.tsx`, `src/components/registry/registry-browser.tsx`, and `src/components/sidebar/new-cabinet-dialog.tsx`.

## How to use this

- Do not silently ignore these failures; record them in validation reports when they block milestone validators.
- Do not spend mission scope fixing them unless the assigned feature explicitly reprioritizes validation debt cleanup.
