## 1. Baseline confirmation

- [ ] 1.1 Verify the documented notification schema matches the persisted `notifications` table and indexes.
- [ ] 1.2 Verify the documented notification types match the service-layer type union and helper functions.
- [ ] 1.3 Verify the documented API behaviors match the current `GET /api/notifications` and `PUT /api/notifications` handlers.

## 2. Trigger and UI coverage

- [ ] 2.1 Verify the documented comment-notification trigger matches the comment creation flow and owner resolution logic.
- [ ] 2.2 Verify the documented bell behavior matches current polling, unread badge, empty state, and mark-read interactions.
- [ ] 2.3 Verify the documented navigation behavior matches tree expansion, page selection, and editor loading from notifications.

## 3. Follow-up alignment

- [ ] 3.1 Identify any mismatches between documented notification types and currently wired triggers.
- [ ] 3.2 Identify any future enhancement work needed for real-time delivery or additional notification channels.
- [ ] 3.3 Use this spec as the baseline for future notification changes before implementation begins.
