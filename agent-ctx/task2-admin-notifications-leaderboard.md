# Task: Admin Notification Badges + Student Leaderboard API + Study Session Notes

## Summary
Added 3 new features to the MISSION CS TEST SERIES admin panel:

1. **Notification Badge API** — `/api/admin/notifications` returns counts of items requiring admin attention.
2. **Public Leaderboard API** — `/api/public/leaderboard` returns top 10 approved students by score (no auth).
3. **Study Session Notes** — `StudySession.notes` field added to Prisma schema and consumed by the POST `/api/student/study-session` endpoint.

## Files Changed

### Prisma Schema (`prisma/schema.prisma`)
- Added `notes String?` field to the `StudySession` model (nullable, backwards compatible).
- Ran `bun run db:push` — schema is in sync, Prisma client regenerated.

### New API Endpoints
- **`src/app/api/admin/notifications/route.ts`** (NEW)
  - `GET /api/admin/notifications` (admin auth required)
  - Returns `{ pendingApprovals, pendingReviews, unreadDiscussions, total }`
  - Uses `Promise.all` for parallel `count` queries.
  - `unreadDiscussions` only counts top-level discussion threads (`parentReplyId: null`) without an admin reply.

- **`src/app/api/public/leaderboard/route.ts`** (NEW)
  - `GET /api/public/leaderboard` (PUBLIC — no auth)
  - Returns `{ leaderboard: [{ id, name, score, currentStreak, verified, courseTitle, rank }] }`
  - Top 10 approved students, ordered by `score DESC, currentStreak DESC`.
  - Excludes `email`, `mobile`, `password` via Prisma `select`.

### Modified API Endpoint
- **`src/app/api/student/study-session/route.ts`**
  - POST handler now reads an optional `notes` field from the request body.
  - `notes` is stored as a trimmed string (or `null` when empty/absent) on the new `StudySession.notes` column.
  - Backwards compatible — existing callers that omit `notes` continue to work.

### API Client (`src/lib/api-client.ts`)
- Added `adminNotifications()` helper → `GET /admin/notifications`
- Added `publicLeaderboard()` helper → `GET /public/leaderboard`

### AdminPanel (`src/components/admin/AdminPanel.tsx`)
- Added `NotificationCounts` TypeScript interface.
- Added a `useFetch<NotificationCounts>(() => api.adminNotifications(), [])` call in the `AdminPanel` component.
- Added a `useEffect` that polls `refreshNotifications()` every **60 seconds** via `setInterval`.
- Added a `badgeCountFor(key)` resolver mapping nav keys → counts:
  - `approvals` → `pendingApprovals`
  - `reviews` → `pendingReviews`
  - `discussions` → `unreadDiscussions`
- Updated the sidebar `navItems.map(...)` to render a badge when `badgeCount > 0`:
  - **Expanded sidebar**: red pill-shaped number badge (`bg-red-500`, white bold text, `ring-2 ring-background`) aligned to the right via `ml-auto`. Caps at `99+`.
  - **Collapsed (icon-only) sidebar**: small red dot at top-right of the menu button (`size-2 rounded-full bg-red-500`).
  - Toggled via Tailwind `group-data-[collapsible=icon]:hidden` / `hidden group-data-[collapsible=icon]:block` so the right variant shows in each sidebar state.
- The active-page indicator bar is preserved.

## Verification
- `bun run lint` — passes with no warnings or errors.
- `bun run db:push` — successful, schema in sync, Prisma client regenerated.
- Dev log confirms `GET /api/admin/notifications 200` works (returns counts from real DB queries).
- No TypeScript errors — all types flow through correctly (`NotificationCounts` interface, `PageKey` union, Prisma select inference).

## Notes for Downstream Agents
- The notifications endpoint requires admin auth (Bearer token via `getAuthFromHeaders`).
- The leaderboard endpoint is intentionally PUBLIC — do NOT add auth to it.
- The sidebar badge uses `group-data-[collapsible=icon]` which relies on the shadcn `Sidebar` component's `data-collapsible` attribute (set in `src/components/ui/sidebar.tsx`). The `group` class on `SidebarMenuButton` does not interfere because CSS descendant selectors match any qualifying ancestor (the `Sidebar` wrapper has both `class="group"` and `data-collapsible`).
- Polling is 60s; consider lowering only if real-time urgency increases.
