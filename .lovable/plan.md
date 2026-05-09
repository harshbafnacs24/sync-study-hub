## Goal

Turn the static HTML/CSS/JS prototype at `nitishkumar110/sync-and-study` into a real product on top of this Lovable workspace, while preserving the dark + neon-yellow design language. Milestone 1 delivers working auth, a database-backed user profile, and two ported screens (Home, Profile) end-to-end.

## Scope of Milestone 1

In scope:
- Port the visual shell (430px mobile frame, fonts, colors, bottom nav) into React.
- Build the Login screen and a Signup screen (email/password + Google OAuth).
- Build the Home screen and Profile screen with real user data.
- Scaffold a separate Express + MongoDB backend in a new top-level `/server` folder, with auth, profile, and friends-stub endpoints.
- Define the API contract and a typed API client used by the React app.

Out of scope (later milestones):
- Match, Room (realtime), Schedule, Friends, AI assist. Routes will exist as empty placeholders only so the bottom nav works.

## Architecture

```text
sync-and-study/  (this Lovable project)
├── src/
│   ├── routes/
│   │   ├── __root.tsx            (global providers, fonts, mobile shell)
│   │   ├── index.tsx             (redirects to /home or /login)
│   │   ├── login.tsx             (public)
│   │   ├── signup.tsx            (public)
│   │   ├── auth.callback.tsx     (Google OAuth return)
│   │   └── _authenticated/
│   │       ├── route.tsx         (guard + bottom-nav layout)
│   │       ├── home.tsx
│   │       ├── profile.tsx
│   │       ├── match.tsx         (placeholder)
│   │       ├── room.tsx          (placeholder)
│   │       ├── schedule.tsx      (placeholder)
│   │       └── friends.tsx       (placeholder)
│   ├── components/
│   │   ├── shell/MobileShell.tsx
│   │   ├── shell/BottomNav.tsx
│   │   └── ui/...                (shadcn re-themed)
│   ├── lib/
│   │   ├── api-client.ts         (fetch wrapper, attaches JWT)
│   │   ├── auth-context.tsx      (user, token, login/logout, Google)
│   │   └── types.ts              (shared API types)
│   └── styles.css                (port design tokens from old repo)

server/  (new — your team will run this separately)
├── src/
│   ├── index.ts                  (express app + cors + error mw)
│   ├── config/env.ts
│   ├── config/db.ts              (mongoose connect)
│   ├── middleware/auth.ts        (verify JWT, attach req.user)
│   ├── modules/auth/
│   │   ├── auth.routes.ts        (POST /signup, /login, /google, GET /me)
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts       (bcrypt, jwt, google id-token verify)
│   ├── modules/profile/
│   │   ├── profile.routes.ts     (GET /profile/me, PATCH /profile/me)
│   │   └── profile.controller.ts
│   └── models/
│       ├── User.ts               (email, passwordHash, googleId, createdAt)
│       └── Profile.ts            (userId, name, avatar, bio, school,
│                                  year, subjects[], goals, timezone)
├── .env.example                  (PORT, MONGO_URI, JWT_SECRET,
│                                  GOOGLE_CLIENT_ID, CORS_ORIGIN)
├── package.json                  (express, mongoose, bcryptjs, jsonwebtoken,
│                                  google-auth-library, zod, cors, dotenv, tsx)
├── tsconfig.json
└── README.md                     (run, deploy, env setup)
```

The React app reads `VITE_API_BASE_URL` and stores the JWT in `localStorage` (simple for milestone 1; we can move to httpOnly cookies later when the backend has its own domain).

## API contract (Milestone 1)

```text
POST   /api/auth/signup        { email, password, name }            -> { token, user }
POST   /api/auth/login         { email, password }                  -> { token, user }
POST   /api/auth/google        { idToken }                          -> { token, user }
GET    /api/auth/me                                                 -> { user }
GET    /api/profile/me                                              -> { profile }
PATCH  /api/profile/me         { name?, avatar?, bio?, school?,
                                  year?, subjects?, goals?, timezone? } -> { profile }
```

All protected routes require `Authorization: Bearer <jwt>`.

## Data model

`User`: `_id`, `email` (unique), `passwordHash?`, `googleId?`, `createdAt`.
`Profile`: `_id`, `userId` (ref User, unique), `name`, `avatar?`, `bio?`, `school?`, `year?`, `subjects: string[]`, `goals?`, `timezone?`, `updatedAt`.

A profile row is created automatically on signup with sensible defaults; the Profile screen lets users fill in study-focused fields later.

## Screens to port (Milestone 1)

1. **Login** — email + password, "Continue with Google" button, link to Signup. Matches existing dark UI with neon-yellow CTA.
2. **Signup** — email, password, display name; same visual style.
3. **Home** — greeting (`Welcome back, {name}`), placeholder cards for "Today's focus", "Active study room", "Suggested buddy" (static data wired from `/auth/me` for the name; other cards are visual placeholders for now).
4. **Profile** — avatar, name, email, editable study-focused fields (school, year, subjects chips, goals, timezone), Logout button.
5. **Bottom nav** — Home, Match, Room, Schedule, Friends, Profile (other tabs route to placeholder pages saying "Coming in next milestone").

## Google OAuth setup (what you'll need to provide)

- A Google Cloud project with an OAuth 2.0 Web client.
- `GOOGLE_CLIENT_ID` (used both in the React app for the Google Identity Services button and on the server to verify the ID token).
- I'll wire the client ID via Lovable secrets when we start implementing.

## Risks / call-outs

- The `/server` folder will not run inside Lovable's preview (Workers can't host Express). You'll run it locally with `npm run dev` and deploy it (Render/Railway/your own host). The React preview will hit `VITE_API_BASE_URL` — for local dev we'll point it at `http://localhost:4000`.
- `localStorage` JWT is fine for this milestone; switch to httpOnly cookies once we have a stable API domain and CORS settings.
- The existing repo's `app.js` swipe / animation code will be reimplemented in React per-screen as those screens land in later milestones.

## Deliverables checklist

- [ ] Mobile shell + design tokens ported into `src/styles.css` and `MobileShell` component.
- [ ] Auth context + API client + JWT storage.
- [ ] Login, Signup, Google OAuth callback wired.
- [ ] `_authenticated` guard + bottom nav layout.
- [ ] Home and Profile screens functional.
- [ ] Placeholder routes for Match / Room / Schedule / Friends.
- [ ] `/server` Express+Mongo scaffold with auth + profile endpoints, `.env.example`, README.
- [ ] `VITE_API_BASE_URL` and `GOOGLE_CLIENT_ID` documented.

Approve this and I'll implement Milestone 1.
