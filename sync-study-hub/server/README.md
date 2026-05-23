# Sync & Study — Backend (Express + MongoDB)

Standalone Node.js backend for the Sync & Study app. Lovable's preview only
runs the React frontend, so this server lives in its own folder and your team
runs / deploys it separately (Render, Railway, Fly, your own VPS, etc.).

## Stack

- Node 18+ / TypeScript
- Express 4
- Mongoose 8 (MongoDB)
- JWT auth (bcryptjs for password hashing)
- Google sign-in via `google-auth-library` (verifies ID tokens from the React app)
- Zod for input validation

## Quick start (local)

```bash
cd server
cp .env.example .env        # then edit .env with your secrets
npm install
npm run dev                 # http://localhost:4000
```

You'll need MongoDB running locally (or a free MongoDB Atlas cluster).
For Atlas, set `MONGO_URI` to your connection string.

## Environment variables

| Name               | Required | Notes                                                                 |
| ------------------ | :------: | --------------------------------------------------------------------- |
| `PORT`             |          | Default `4000`.                                                       |
| `MONGO_URI`        |    ✓     | Mongo connection string.                                              |
| `JWT_SECRET`       |    ✓     | Long random string. Rotate before going to prod.                      |
| `JWT_EXPIRES_IN`   |          | Default `7d`. Accepts `vercel/ms` syntax.                             |
| `CORS_ORIGIN`      |    ✓     | Comma-separated allowed origins (the React app's URL).                |
| `GOOGLE_CLIENT_ID` |          | Web OAuth client ID. Must match `VITE_GOOGLE_CLIENT_ID` in the app.   |

## API

All JSON. Authenticated routes require `Authorization: Bearer <jwt>`.

| Method | Path                  | Auth | Body                                       |
| ------ | --------------------- | :--: | ------------------------------------------ |
| GET    | `/health`             |      |                                            |
| POST   | `/api/auth/signup`    |      | `{ email, password, name }`                |
| POST   | `/api/auth/login`     |      | `{ email, password }`                      |
| POST   | `/api/auth/google`    |      | `{ idToken }` (Google ID token)            |
| GET    | `/api/auth/me`        |  ✓   |                                            |
| GET    | `/api/profile/me`     |  ✓   |                                            |
| PATCH  | `/api/profile/me`     |  ✓   | Any subset of profile fields (see below)   |

### Profile shape

```ts
{
  userId, name, avatar, bio,
  school, year, subjects: string[],
  goals, timezone, updatedAt
}
```

A profile row is created automatically on signup / first Google login.

## Connecting the frontend

In the Lovable React app, set:

```
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=<your Google web client ID>
```

(Use the deployed URL of this server in production.)

## Project layout

```
server/
├── src/
│   ├── index.ts                 Express app entry
│   ├── config/{env,db}.ts       Config + Mongo connect
│   ├── middleware/auth.ts       JWT verify + signing helpers
│   ├── models/{User,Profile}.ts Mongoose models
│   └── modules/
│       ├── auth/                Signup / login / Google / me
│       └── profile/             GET/PATCH /api/profile/me
└── .env.example
```

## What's next (later milestones)

- `friends`, `match`, `room` (realtime via Socket.IO)
- `sessions` for Pomodoro/study tracking + analytics
- AI doubt-assist endpoint
