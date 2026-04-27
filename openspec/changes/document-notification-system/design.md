## Context

Cabinet already ships a working notification system that spans storage, server-side mutation, authenticated APIs, and client presentation. Notifications are persisted in SQLite via a dedicated `notifications` table keyed by user, type, page path, and created timestamp, and are currently triggered from collaboration flows such as page comments. The user-facing experience is the notification bell, which polls for the latest notifications, renders unread state, and navigates the user to a linked page when a notification is selected.

This change does not introduce new runtime behavior. Its purpose is to convert implementation knowledge into explicit OpenSpec artifacts so future contributors can evolve the notification flow against a documented baseline.

## Goals / Non-Goals

**Goals:**
- Document the current end-to-end notification flow from trigger to UI.
- Define the storage and API contract that existing code already relies on.
- Record the current notification event types and read-state transitions.
- Give future work a clear baseline for extending notification triggers and UX.

**Non-Goals:**
- Redesign notification delivery or add push, email, desktop, or websocket transport.
- Change the notification schema, retention policy, or comment authorization model.
- Add missing mention or lock-release trigger wiring that is not already active in the current codebase.

## Decisions

- The documented capability will reflect the current persisted notification model implemented by `notification-service.ts`, including `comment`, `mention`, and `lock_released` as the supported notification types, even though only comment notifications are currently wired from an API flow.
- The spec will treat `/api/notifications` as the canonical authenticated interface for reading notifications and marking them read, because the UI depends exclusively on that route.
- The spec will capture polling-based freshness rather than real-time delivery because the current bell fetches on mount and every 30 seconds instead of subscribing to server-pushed events.
- The spec will define page-linked navigation as part of the notification experience because selecting a notification expands the tree, selects the page, and loads it into the editor.
- The spec will scope cleanup helpers such as path migration and pruning as internal maintenance behavior, not user-visible API requirements.

## Risks / Trade-offs

- Documenting the current implementation may expose asymmetry between supported notification types in the service layer and the subset of triggers that are actually invoked today.
- A spec grounded in polling may need later revision if the product moves to event streaming or desktop-native notification delivery.
- Because this change documents existing behavior rather than redesigning it, known UX limitations such as silent fetch failures and fixed polling intervals remain accepted for now.
