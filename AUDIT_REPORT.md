# CoStudy54 / StudySync — Full Audit Report

> Audited: backend (`studysync-backend`, Spring Boot microservices + PostgreSQL, Docker) and
> frontend (`CoStudy54`, React Native / Expo). Report produced **before** any changes.

## Legend
- **B** = backend (`studysync-backend`)
- **F** = frontend (`CoStudy54`)
- Severity: P0 (critical / data-corrupting), P1 (breaks a core flow), P2 (UX / edge case)

---

## P0 — Group Chat & Invitations (priority)

### B1. Invitation accept is non-idempotent & non-transactional (P0)
- File: `learning-service/.../invite/InviteController.accept`
- Root cause: `accept()` has no `@Transactional` and no guard against concurrent/duplicate
  execution. Two near-simultaneous Accept taps both read `PENDING`, both flip to `ACCEPTED`,
  both call `join()`. The second `join()` throws `already a member` → user sees "Action failed"
  even though they joined. Worse, because the write of `status` is not atomic with the join, the
  invite can be left in an inconsistent state.
- Why: check-then-act without a transaction or DB-level lock.
- Impact: confusing errors on double-tap; potential inconsistency. This is the root cause behind
  the reported "accepting an invite sometimes creates a cloned group" — combined with F1/F2 below,
  the accepted group fails to appear and the user re-accepts / the list shows stale/duplicated rows.

### B2. Duplicate pending invites allowed (P0)
- File: `learning-service/.../invite/GroupInvite` entity + `InviteController.send`
- Root cause: `group_invite` has **no unique constraint** on `(group_id, to_user_id)`. An admin
  can (and the UI lets you) send the same invite many times → many PENDING rows.
- Impact: "Multiple invitations" become duplicate noise; accepting one still leaves dangling
  PENDING invites; the invites list can show the same person/group repeatedly.

### B3. `sendInvite` can target the sender / mismatch group (P1)
- `InviteController.send` only checks `fromUserId != toUserId`. It does not verify the inviter is
  a member/admin of `groupId`, nor that `groupId` exists. A crafted request can invite into any
  group or invent a `groupName`.

### F1. Groups list is stale after accepting an invite (P0 — "cloned group" symptom)
- File: `screens/GroupsScreen.tsx`
- Root cause: `load()` runs only in `useEffect(..., [load])` (on mount). Navigating back from the
  Invites screen does **not** remount the tab, so the newly-joined group never appears until a
  manual pull-to-refresh.
- Impact: After accepting, the group is "missing"; users re-accept or think it cloned. Fix = reload
  on tab focus + dedupe by `groupId`.

### F2. InvitesScreen does not refresh the Groups list after accept (P1)
- File: `screens/InvitesScreen.tsx`
- After `acceptInvite`, only the invites list reloads. The Groups tab is never told to refresh.

### F3. Group chat stuck on "connecting..." (P0)
- File: `screens/ChatScreen.tsx` (line 521) + `api.ts` `WS_URL` (line 202)
- Root cause: `connected` flips true **only** in `onConnect`. If the WebSocket cannot reach
  `ws://172.20.10.2:8082/ws` (hardcoded LAN IP — wrong for emulators `10.0.2.2`, or after DHCP
  change), `@stomp/stompjs` silently retries every 3s and the header stays "connecting..." forever.
  There is no timeout, no error state, and no fallback.
- Impact: Chat opens and never connects; user is blocked.

### F4. Cannot send until connected + no optimistic send (P0)
- File: `screens/ChatScreen.tsx` (`send()` line 194, `publish()` line 162)
- Root cause: `send()` returns early when `!connected`; the sender relies entirely on the STOMP
  echo to see their own message. If the echo is missed (brief disconnect) the message never appears
  for the sender (others see it) → "missing message".
- Impact: "Users must always be able to send immediately after opening" is violated.

### B4. Chat messages have no authorization (P1 — security)
- File: `learning-service/.../chat/ChatController.handle`
- Root cause: `senderId`/`senderName` come from the message body and there is no check that the
  sender is a member of `groupId`. Anyone who knows a groupId can post as anyone.
- Impact: spoofed messages; no real access control on chat.

### B5. Deleting a group leaves orphaned chat messages (P2)
- File: `learning-service/.../service/GroupService.deleteGroup`
- Root cause: deletes members + group but never deletes `chat_message` rows for that group.
- Impact: Orphaned rows accumulate; if a group with the same id were ever recreated the old
  messages would resurface.

### B6. `clearChat`/`deleteMessage` reachability (P2)
- These work but rely on the raw `/ws` STOMP endpoint. See F3 for client reachability.

---

## P1 — Other backend issues

### B7. No group-limit enforcement (P2)
- `free.max-groups: 3` is configured but `GroupService.create/join` never checks it.

### B8. `auth-service` JWT expiry hard behavior (P2)
- `jwt.exp-min: 60` (auth yml) while docker-compose sets `JWT_EXP_MIN` (used by `JwtService`).
  Confirm `JwtService` reads the env; if it defaults to 15min mismatch, sessions may expire early.

### B9. Gateway does not route WebSocket `/ws` (by design) (P1)
- The gateway only routes `/api/**`. The client connects to learning-service `:8082/ws` directly
  (correct), but this means WS is not behind the gateway's (absent) CORS/auth. Acceptable, but the
  hardcoded IP (F3) is the real problem.

### B10. In-app notifications never pushed to the phone (P0 for "Push Notifications" feature)
- `engagement` stores `notification` rows (the "green dot") but nothing ever sends a real push and
  nothing calls `NotificationService` when a chat message / invite is created.

---

## P2 — Missing features (explicitly requested)

### M1. Session Reviews & Ratings — backend DONE, frontend MISSING
- Backend: `Review` entity, `ReviewService` (enforces `booking.status == COMPLETED`),
  `ReviewController` POST `/api/reviews`, `TutorController` GET `/api/tutors/{id}/reviews`.
- Missing: `api.ts` has **no `createReview`**, and **no UI** to submit a 5-star + text review after
  a completed session. `TutorSessionsScreen` shows sessions but offers no review action.

### M2. Analytics Dashboard — MISSING (no study-time aggregation)
- `study_session` (learning schema) records `subject` + `duration_minutes` + `session_date`, and
  `logStudySession`/`getStudySessions` exist on the client.
- `engagement.AnalyticsService` only counts generic `analytics_event`s — there is **no weekly
  productivity aggregation** of study time, and no chart UI.

### M3. Push Notifications — MISSING (in-app only)
- No Expo push token registration, no push-sending service, no client listener. Users only see the
  in-app green dot.

---

## P2 — Frontend robustness

### F5. No `useFocusEffect` refresh on Groups/Planner (covered by F1)
### F6. `App.tsx` forces a fixed 2.5s splash regardless of readiness (P2)
### F7. `listUsers()` fetches ALL users on every FindPeople open (P2 perf)
### F8. Image/file open uses a hardcoded `172.20.10.2` host via `FILE_HOST` (P1)
- `ChatScreen` `FILE_HOST = WS_URL.replace("ws://","http://").replace("/ws","")` → `http://172.20.10.2:8082`.
  Same hardcoded-IP fragility as F3.
