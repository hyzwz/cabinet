## ADDED Requirements

### Requirement: Persist collaboration notifications per user
The system SHALL persist in-app notifications in durable storage so each notification is associated with a target user, a notification type, a title, an optional page path, an optional actor name, a read flag, and a creation timestamp.

#### Scenario: Create a notification record
- **WHEN** application code creates a notification for a user
- **THEN** the system stores a unique notification record with the target user identifier, notification metadata, unread state, and created timestamp

#### Scenario: Support page-linked notifications
- **WHEN** a notification is associated with a page in the workspace
- **THEN** the system stores the page path with the notification so clients can navigate to that page later

### Requirement: Generate notifications for collaboration events
The system SHALL support creation of notification records for collaboration event types `comment`, `mention`, and `lock_released`.

#### Scenario: Notify a page owner about a new comment
- **WHEN** an authenticated user adds a comment to a page owned by another user
- **THEN** the system creates a `comment` notification for the page owner referencing the page path and commenter display name

#### Scenario: Do not notify the commenting user about their own page
- **WHEN** a page owner comments on their own page
- **THEN** the system does not create a page-owner comment notification for that action

### Requirement: Provide authenticated notification retrieval
The system SHALL expose an authenticated API for retrieving a user's notifications and unread count.

#### Scenario: List notifications for the current user
- **WHEN** an authenticated client sends `GET /api/notifications`
- **THEN** the system returns notifications for the current user ordered from newest to oldest together with the user's unread count

#### Scenario: Filter unread notifications
- **WHEN** an authenticated client sends `GET /api/notifications?unread=true`
- **THEN** the system returns only unread notifications for the current user and still includes the unread count summary

#### Scenario: Paginate notification results
- **WHEN** an authenticated client sends `GET /api/notifications` with `limit` and `offset`
- **THEN** the system applies those values when selecting notification rows for the current user

#### Scenario: Reject unauthenticated reads
- **WHEN** a client requests `GET /api/notifications` without an authenticated user
- **THEN** the system responds with an authentication error

### Requirement: Allow authenticated read-state updates
The system SHALL allow an authenticated user to mark either one notification or all of their notifications as read.

#### Scenario: Mark one notification as read
- **WHEN** an authenticated client sends `PUT /api/notifications` with a notification `id` belonging to that user
- **THEN** the system marks that notification as read and returns success

#### Scenario: Reject marking a missing or foreign notification
- **WHEN** an authenticated client sends `PUT /api/notifications` with an `id` that does not belong to that user or does not exist
- **THEN** the system responds with a not-found error

#### Scenario: Mark all notifications as read
- **WHEN** an authenticated client sends `PUT /api/notifications` with `readAll: true`
- **THEN** the system marks all unread notifications for that user as read and returns the count of updated records

#### Scenario: Reject malformed read-state updates
- **WHEN** an authenticated client sends `PUT /api/notifications` without either a notification `id` or `readAll: true`
- **THEN** the system responds with a validation error

### Requirement: Present notifications in the application shell
The system SHALL present notifications through the notification bell UI in the client application shell.

#### Scenario: Show unread badge count
- **WHEN** the current user has unread notifications
- **THEN** the notification bell displays the unread count, capped visually at `99+`

#### Scenario: Refresh notifications by polling
- **WHEN** the notification bell is mounted
- **THEN** it fetches the latest notifications immediately and refreshes them on a 30 second polling interval

#### Scenario: Show empty state when no notifications exist
- **WHEN** the current user has no notifications to display
- **THEN** the notification panel shows an empty-state message instead of notification rows

#### Scenario: Mark notification read on interaction
- **WHEN** a user activates an unread notification row or its explicit read action
- **THEN** the client requests that notification be marked as read and refreshes the displayed notification list

#### Scenario: Navigate from a page-linked notification
- **WHEN** a user activates a notification with a page path
- **THEN** the client expands the relevant tree path, selects the page, loads it into the editor, and closes the notification panel
