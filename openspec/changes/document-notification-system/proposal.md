## Why

Cabinet already includes a working in-app notification flow for collaboration events, but that behavior is only implied by code paths and database migrations rather than captured in OpenSpec artifacts. We need a formal spec now so future changes to comment notifications, read state handling, and page-linked navigation can be made against an explicit contract instead of reverse-engineering existing behavior.

## What Changes

- Add an OpenSpec change that documents the existing notification system as a first-class capability.
- Capture current notification triggers, storage model, retrieval semantics, and read-state transitions.
- Define the current API contract for listing notifications and marking one or many notifications as read.
- Describe the UI behavior of the notification bell, including polling, unread badge display, and page navigation from a notification.
- Establish implementation tasks for aligning future work with the documented behavior.

## Capabilities

### New Capabilities
- `notification-system`: Documents how Cabinet creates, stores, retrieves, displays, and updates collaboration notifications.

### Modified Capabilities
- None.

### Removed Capabilities
- None.

## Impact

### Affected Specs
- `notification-system`: New capability spec for in-app collaboration notifications.

### Affected Code
- `src/lib/collaboration/notification-service.ts`: Core notification creation, querying, mutation, and cleanup logic.
- `src/app/api/notifications/route.ts`: Authenticated API for listing notifications and marking them read.
- `src/app/api/comments/[...path]/route.ts`: Existing comment flow that triggers page-owner notifications.
- `src/components/notifications/notification-bell.tsx`: Client UI for polling, displaying, and navigating from notifications.
- `server/migrations/004_notifications.sql`: Database schema for persisted notifications.
