# Architecture

How the demo i18n system works for Cabinet core UI.

**What belongs here:** app-wide locale state, message dictionaries, UI integration points, persistence rules, fallback rules, and boundaries for this mission.

---

## Existing application shape

Cabinet is a Next.js App Router application with a client-heavy UI shell built from Zustand stores and shared layout components. The demo route runs through login, home, sidebar-driven navigation, editor, Agents, Tasks, and Settings.

## Demo i18n architecture

The mission adds a lightweight client-side i18n layer instead of route-based or server-loaded localization.

Core pieces:
- a small locale state holder with `zh` and `en`
- message dictionaries grouped by module/surface
- a translation lookup API with English fallback
- a visible language switcher in header chrome next to theme controls
- persistence of locale selection across refreshes
- document language synchronization through `<html lang>`

## Data flow

1. App boots.
2. Locale state initializes from persisted preference if present; otherwise defaults to `zh`.
3. Shared i18n provider/store exposes current locale and translation lookup to client components.
4. Covered components read translated labels from the i18n layer.
5. User changes locale from the header switcher.
6. Locale state updates immediately, UI re-renders, preference is persisted, and document language is updated.

## Fallback rules

- Covered demo surfaces should use explicit translation keys.
- If a translation is missing for the active locale, the UI falls back to English.
- Fallback must never produce blank critical UI or runtime errors.
- Uncovered pages may continue showing existing English copy.

## Scope boundaries

This mission does not introduce:
- locale-prefixed routes
- server-side translation loading
- full-site localization cleanup
- deep translation of onboarding, transcript, registry internals, or low-frequency pages

## High-risk surfaces

These surfaces are intentionally constrained to first-screen/core copy because they are large and string-dense:
- `components/agents/agents-workspace.tsx`
- `components/tasks/tasks-board.tsx`
- `components/settings/settings-page.tsx`
- parts of sidebar dialogs and tree actions

## Invariants

- Default locale is Chinese on a fresh session.
- Language switcher is visible in header chrome near theme controls.
- Refresh preserves locale preference.
- Switching language does not reset theme selection.
- Brand/product names can remain stable where appropriate.
- Mission changes must remain isolated to i18n-related files and required progress logging.


## Docker demo runtime

- The real user-facing demo frontend is the Dockerized Cabinet app exposed on `http://localhost:3100`.
- Source-based validation on `4000` remains useful for implementation-level i18n work, but Docker runtime validation on `3100` is required for the actual demo surface.
- The Docker frontend depends on a correct Next.js production build and a runtime layout that serves `/_next/static/*` assets successfully. If static assets are missing or misplaced, the app may return HTML while losing styles and client interactivity.
