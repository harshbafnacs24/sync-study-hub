# Sync & Study — Build Plan (Milestone 2 → 5)

This is a large scope. I'll deliver it in **4 sequenced milestones** so each one ships working, testable code instead of half-built systems. Approve this plan and I'll start with Milestone 2 immediately.

---

## Guiding principles

- **Bold minimalism**: Linear/Notion-grade UI. Sharp typography, generous spacing, no gradients, no playful accents beyond the existing neon-yellow primary on dark.
- **No dead UI**: every button wired to state + API + loading/error.
- **Service-layer architecture**: AI, sockets, and data access live in dedicated modules — never inline in components.
- **Sage as a first-class citizen**: every backend module emits structured events Sage can read; conversation + context store from day one.

---

## Architecture additions

### Frontend (`src/`)
```text
lib/
  api/            ← typed clients per domain (tasks, rooms, sessions, sage, analytics, notifications)
  hooks/          ← useTasks, useFocusTimer, useStudyRoom, useSage, useAnalytics
  sage/           ← SageProvider, prompt builder, streaming parser
  socket.ts       ← Socket.IO client singleton
components/
  dashboard/  rooms/  focus/  tasks/  analytics/  sage/  notifications/  settings/
  ui-primitives/  ← Card, StatTile, SectionHeader, EmptyState, Sheet wrappers
routes/_authenticated/
  home.tsx (dashboard)  rooms.tsx  rooms.$id.tsx  focus.tsx
  tasks.tsx  analytics.tsx  sage.tsx  notifications.tsx  settings.tsx
```

### Backend (`server/src/`)
```text
modules/
  auth/  profile/  tasks/  rooms/  sessions/  analytics/  notifications/  sage/
shared/
  middleware/ (auth, validate, errorHandler, rateLimit)
  utils/ (asyncHandler, logger, pagination)
  validation/ (zod schemas per module)
realtime/
  socket.ts (Socket.IO server, room namespaces, shared timer events)
ai/
  provider.ts        ← unified interface: chat(), stream(), embed()
  providers/claude.ts  providers/gemini.ts  providers/openai.ts
  context-builder.ts ← pulls user tasks/sessions/streak into Sage prompt
  rate-limit.ts
```
API base path becomes `/api/v1/...` for versioning.

### MongoDB schemas
`User`, `Profile`, `Task`, `StudySession` (focus blocks), `StudyRoom`, `RoomParticipant`, `Analytics` (aggregated daily rollup), `SageConversation` + `SageMessage`, `Notification`. All include `userId` index + `createdAt`; rooms include `participants[]` + `activeTimer`.

---

## Milestone 2 — Tasks + Dashboard + Focus Timer (this turn after approval)

**Backend**
- `/api/v1/tasks` full CRUD with priority/status/dueDate, zod validation, pagination.
- `/api/v1/sessions` start/stop/list focus sessions; auto-rolls into `Analytics`.
- `/api/v1/analytics/summary` returns today + 7-day stats + streak.
- Shared middleware: `validate(zodSchema)`, `errorHandler`, `requireAuth`.

**Frontend**
- Real **Dashboard**: today's focus minutes, streak, next 3 tasks, active session card, quick actions (Start focus, New task, Open Sage).
- **Tasks** page: list + create sheet + inline complete + priority chips + delete.
- **Focus** page: Pomodoro (25/5/15 configurable), session controls, live tick, persists to backend on complete, break management.
- Reusable primitives: `Card`, `StatTile`, `SectionHeader`, `EmptyState`, `PriorityBadge`.
- Bottom nav updated: Home, Focus, Tasks, Rooms, Sage, Profile.

---

## Milestone 3 — Study Rooms (real-time) + Notifications

**Backend**
- Socket.IO server mounted on Express; JWT handshake auth.
- Room CRUD + join/leave; events: `participant:join/leave`, `timer:start/pause/reset`, `chat:message`.
- Notifications module: persisted + delivered via socket; types: session reminder, task due, room invite.

**Frontend**
- **Rooms list**: create room (name, topic, max size, visibility), join by code, live participant counts.
- **Room detail**: participant list, shared timer (synced to host), lightweight chat, leave button.
- **Notifications** page + bell badge in dashboard header.

---

## Milestone 4 — Sage AI + Analytics

**Backend**
- `ai/provider.ts` unified interface; first concrete provider = Claude (env: `ANTHROPIC_API_KEY`); Gemini/OpenAI as drop-in alternates.
- `/api/v1/sage/conversations` (list/create/delete), `/api/v1/sage/conversations/:id/messages` (POST streams via SSE).
- `context-builder.ts` injects: profile, today's tasks, current streak, recent sessions → system prompt. Persists every turn to `SageMessage`.
- Rate limit per user; token accounting.

**Frontend**
- **Sage** page: persistent conversation list (sidebar sheet), streaming message view with markdown, suggested prompts ("Plan my day", "Quiz me on…", "Summarize my week"), context chips showing what Sage can see.
- `useSage` hook + `SageProvider` for cross-page quick-ask.

**Analytics page**
- Weekly bar chart (focus minutes), subject breakdown, productivity score, streak calendar. Uses `recharts`.

---

## Milestone 5 — Settings + polish

- **Settings**: profile editor, theme (already dark; expose accent toggle later), Pomodoro defaults, Sage preferences (model, tone, context opt-in toggles), notification preferences, logout.
- Global toast system on errors, skeleton loaders on every fetch, empty states everywhere, route-level error boundaries.
- Remove `DEV_BYPASS_AUTH` flag; document local-run steps.

---

## Technical details (for the devs)

- **State**: TanStack Query for all server state; Zustand only for transient UI (active timer tick, socket connection status).
- **Validation**: zod on both client (forms via react-hook-form) and server (request bodies).
- **Errors**: server returns `{ error, code, details? }`; client shows toast + inline field errors.
- **Streaming**: Sage uses SSE (`text/event-stream`) — works through Express without WS overhead.
- **Secrets needed later** (I'll prompt at the right milestone, not now): `ANTHROPIC_API_KEY`, optional `GEMINI_API_KEY`, `OPENAI_API_KEY`.
- **Sage memory roadmap**: schema already supports it (per-conversation messages + per-user `SageMemory` collection added in M4 as empty stub for future embeddings).

---

## What I need from you to start

1. **Approve this plan** (or tell me which milestone to reorder/cut).
2. Confirm: keep `DEV_BYPASS_AUTH = true` during M2–M4 so you can click through everything without running the backend, then flip off in M5? (Recommended: yes.)
3. For Sage in M4 — provide `ANTHROPIC_API_KEY` when we get there, or should I stub Sage with a mock provider first so the UI is fully testable without a key?

On approval I'll start **Milestone 2** in the next turn.
