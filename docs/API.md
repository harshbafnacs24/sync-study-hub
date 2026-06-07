# Sync & Study Hub — REST API Reference

Base URL: `https://sync-study-hub-production.up.railway.app`  
Auth: `Authorization: Bearer <JWT>` on protected routes.

## Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | TanStack Start + React (Cloudflare Workers) | Web + mobile shell |
| Backend | Express + MongoDB + Socket.IO (Railway) | REST API + realtime |
| Mobile | Capacitor 8 (Android/iOS) | Native wrapper loading web app |

All mobile clients should use the same REST API and Socket.IO endpoints documented below.

## Auth

- `POST /api/v1/auth/signup` — `{ email, password, name }`
- `POST /api/v1/auth/login` — `{ email, password }`
- `POST /api/v1/auth/google` — `{ idToken }`
- `GET /api/v1/auth/me` — current user

## Profile

- `GET /api/v1/profile/me` — get profile
- `PATCH /api/v1/profile/me` — update profile
- `POST /api/v1/profile/setup` — complete onboarding (`profileCompleted: true`)

## Network / Friends

- `GET /api/v1/network/discover?skip=0&limit=20` — browse completed profiles
- `GET /api/v1/network/search?q=...` — search users
- `GET /api/v1/network/for-you` — interest-based recommendations
- `GET /api/v1/network/friends` — accepted friends list
- `GET /api/v1/network/user/:id` — profile + mutual friends count
- `GET /api/v1/network/connections` — all connection requests
- `POST /api/v1/network/connections` — `{ toUserId }` send request
- `PUT /api/v1/network/connections/:id` — `{ status: "accepted" | "rejected" }`
- `DELETE /api/v1/network/connections/:id` — remove/cancel

## Direct Messages

- `GET /api/v1/conversations` — inbox list
- `POST /api/v1/conversations` — `{ peerId }` start chat (friends only)
- `GET /api/v1/conversations/:id/messages` — chat history
- `POST /api/v1/conversations/:id/messages` — send message
- `POST /api/v1/conversations/:id/read` — mark read
- `POST /api/v1/uploads/chat/:conversationId` — upload file (multipart)

## Communities

- `GET /api/v1/communities` — list public communities
- `POST /api/v1/communities` — create study group
- `GET /api/v1/communities/:id` — community detail
- `POST /api/v1/communities/:id/join` — toggle join/leave
- `GET /api/v1/communities/:id/channels` — list channels
- `GET /api/v1/communities/channels/:channelId/messages` — channel history
- `POST /api/v1/communities/channels/:channelId/messages` — `{ text }` post message

## Posts / Social Feed

- `GET /api/v1/posts/feed` — friends-only feed
- `POST /api/v1/posts` — `{ content, mediaUrl?, mediaType? }`
- `PATCH /api/v1/posts/:id` — edit own post
- `DELETE /api/v1/posts/:id` — delete own post
- `POST /api/v1/posts/:id/like` — toggle like
- `GET /api/v1/posts/:id/comments` — list comments
- `POST /api/v1/posts/:id/comments` — `{ content }`
- `POST /api/v1/uploads/post` — upload image/GIF for posts

## Notifications

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `POST /api/v1/notifications/read-all`
- `POST /api/v1/notifications/:id/read`

## Realtime (Socket.IO)

Connect to the Railway backend URL with JWT in `auth.token`.

Events: `message:new`, `conversation:updated`, `notification:new`, `connection:request`, `connection:accepted`, `presence:online`, `presence:offline`

## File Types Supported

PDF, DOC/DOCX, PPT/PPTX, JPEG, PNG, GIF, WebP, ZIP (max 10 MB)
