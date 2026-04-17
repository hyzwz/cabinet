# Cabinet AI Runtime and Live Sessions

_Last updated: 2026-04-15_

This file replaces the older Claude-only, PTY-first description.

Cabinet now uses two related execution modes:

1. **Structured adapter runs** for most detached work such as tasks, jobs, and heartbeats.
2. **Interactive WebTerminal sessions** for direct CLI workflows and live operator-style experiences.

The goal of the migration is **not** to remove the terminal. The goal is to stop depending on a browser terminal for every AI run. `WebTerminal` remains a core product capability and is intentionally being kept for future features such as Cabinet-managed tmux-style workspaces.

---

## Current Split

### Structured runtime

Structured adapters are now the default for detached runs:

- manual tasks launched from shared composers
- scheduled jobs
- agent heartbeats
- task detail and other native conversation views

These runs stream normalized transcript chunks into the conversation store and render from persisted conversation detail instead of xterm.

### Interactive terminal runtime

`WebTerminal` is still used where interactivity matters:

- global terminal tabs
- the AI editor panel's live sessions
- remaining live agent surfaces that still mount `WebTerminal`
- future terminal-native workflows such as Cabinet-managed tmux-like sessions

These sessions still use PTY + WebSocket plumbing and xterm.js.

---

## Providers and Adapters

Cabinet currently registers two built-in CLI providers and four adapters:

| Provider | Adapter | Engine | Status |
|---|---|---|---|
| Claude Code | `claude_local` | `structured_cli` | Default detached runtime |
| Codex CLI | `codex_local` | `structured_cli` | Default detached runtime |
| Claude Code | `claude_code_legacy` | `legacy_pty_cli` | Experimental escape hatch |
| Codex CLI | `codex_cli_legacy` | `legacy_pty_cli` | Experimental escape hatch |

Current default direction:

- Claude provider defaults to `claude_local`
- Codex provider defaults to `codex_local`
- legacy PTY adapters remain available for compatibility and interactive use cases

---

## Detached Task Flow

This is the current path for task, job, and heartbeat execution.

### 1. Runtime selection

The shared composer runtime picker fetches provider metadata from `/api/agents/providers` and lets the user choose:

- provider
- model
- reasoning effort

Those choices are carried as `providerId`, `adapterType`, and `adapterConfig`.

### 2. Conversation creation

`POST /api/agents/conversations` resolves the effective runtime:

- explicit per-run overrides win
- otherwise Cabinet falls back to persona/job defaults
- otherwise Cabinet uses the app/provider default adapter

The route then calls `startConversationRun()`.

### 3. Daemon launch

`startConversationRun()` writes the conversation record, then asks the daemon to create a session.

Inside `server/cabinet-daemon.ts`, Cabinet branches on the adapter execution engine:

- `structured_cli` adapters call `createStructuredSession()`
- `legacy_pty_cli` adapters call `createDetachedSession()`

That means the daemon now supports both runtime families instead of assuming every run is a PTY.

### 4. Provider execution

The structured adapters run the provider CLI directly and translate JSON/event streams into Cabinet-friendly transcript output:

- `claude_local` uses Claude streaming JSON and supports `model` and `effort`
- `codex_local` uses `codex exec --json --ephemeral` and supports `model`

The important change is that Cabinet persists normalized transcript output as the canonical live state instead of replaying raw terminal frames for every task surface.

### 5. Live rendering

Native conversation views such as the task detail panel now use `ConversationSessionView` and `ConversationLiveView`.

These views:

- poll conversation detail
- render structured transcript content
- switch to result view automatically when the run completes

For those surfaces, the browser terminal is no longer the primary renderer.

---

## Interactive AI Editor Flow

The AI editor panel is still terminal-backed today.

High-level flow:

1. The user submits an instruction in the AI panel.
2. Cabinet creates or reconnects to a daemon session.
3. A `WebTerminal` component mounts and connects over WebSocket.
4. The provider CLI runs inside a PTY-backed session when interactivity is required.
5. The editor reloads the page after the run finishes.

This is still useful because the editor experience benefits from:

- live terminal feedback
- reconnectable long-running sessions
- user-visible interactive output

That said, this is now one runtime surface among several, not the product-wide execution model.

---

## Where `WebTerminal` Still Matters

`WebTerminal` is intentionally being preserved for:

- direct human-operated CLI sessions in Cabinet
- interactive editor runs
- debugging and fallback workflows
- future terminal-native features, including tmux-like multi-session workflows managed from Cabinet

The migration away from terminal-first tasks should not be read as a plan to remove terminal functionality from the product.

---

## Remaining Tasks

The runtime migration is functional, but not complete. The main remaining tasks are:

1. Decide surface-by-surface which experiences should be transcript-first and which should stay terminal-first.
2. Extend the native live conversation renderer to more non-interactive surfaces where `WebTerminal` is still mounted mainly for output display.
3. Keep `WebTerminal` as a dedicated interactive subsystem and define the product direction for Cabinet-managed terminal features such as tmux-like workspaces.
4. Make legacy PTY adapters clearly labeled as experimental in every relevant UI.
5. Expand provider coverage beyond Claude Code and Codex CLI.
6. Add more lifecycle and integration coverage around structured sessions, adapter selection, and fallback behavior.

---

## Key Files

| File | Role |
|---|---|
| `src/components/composer/task-runtime-picker.tsx` | Shared provider/model/effort picker |
| `src/app/api/agents/providers/route.ts` | Provider + adapter metadata for the UI |
| `src/app/api/agents/conversations/route.ts` | Manual conversation/task creation |
| `src/lib/agents/conversation-runner.ts` | Conversation persistence + daemon launch |
| `src/lib/agents/adapters/registry.ts` | Adapter registration and defaults |
| `src/lib/agents/adapters/claude-local.ts` | Structured Claude detached runtime |
| `src/lib/agents/adapters/codex-local.ts` | Structured Codex detached runtime |
| `server/cabinet-daemon.ts` | Unified daemon for structured runs, PTY sessions, scheduler, and events |
| `src/components/agents/conversation-session-view.tsx` | Shared live/result conversation renderer |
| `src/components/terminal/web-terminal.tsx` | xterm.js + WebSocket terminal client |

---

## Short Version

- Cabinet is no longer terminal-first for task execution.
- Structured adapters are the default detached runtime.
- Native transcript views are now the default renderer for main task/conversation surfaces.
- `WebTerminal` is still part of the product and is being kept intentionally for interactive workflows and future terminal-native features.
