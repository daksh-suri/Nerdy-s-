# Backend (Express 5 + Node.js ESM)

## Entry Point — `server/index.js`

1. Loads env vars via `dotenv/config`
2. Creates a `pg.Pool` and `PrismaPg` adapter, instantiates `PrismaClient`
3. Creates Express app + HTTP server + Socket.io
4. Registers middleware: CORS, JSON parsing
5. Mounts 9 route modules:
   - `/api/auth` — register, login, Google OAuth, session restore
   - `/api/logs` — book logs CRUD + community/public feeds
   - `/api/favorites` — favorites CRUD (idempotent upsert)
   - `/api/chat` — chat room listing + message history
   - `/api/ai` — mood-based recommendations + rule-based librarian chat
   - `/api/dna` — reading stats & analytics (auth required)
   - `/api/profile` — bio update (auth required)
   - `/api/friends` — friend list & add (auth required)
   - `/api/books` — Google Books proxy (search, trending, details)
6. Health check: `GET /ping`
7. Sets up Socket.io handlers
8. Seeds 7 default chat rooms on startup (idempotent upsert)
9. Keep-alive self-ping every 14 minutes (Render free-tier workaround)

## Authentication Middleware — `server/middleware/auth.js`

- Extracts Bearer token from `Authorization` header
- Verifies with `jsonwebtoken` using `JWT_SECRET` env var
- Fetches user from DB, attaches `req.user = { id, username, email }`
- Returns 401 on missing/invalid token or deleted user

## Route Details

### Auth (`/api/auth`)
| Method | Path          | Auth | Description                        |
|--------|---------------|------|------------------------------------|
| POST   | /register     | No   | Create account (bcrypt, 12 rounds) |
| POST   | /login        | No   | Email/password sign-in             |
| POST   | /google       | No   | Google OAuth credential flow       |
| GET    | /me           | No*  | Restore session from JWT           |

\* /me reads token from header manually (no middleware).

### Books (`/api/books`)
| Method | Path          | Auth | Description                          |
|--------|---------------|------|--------------------------------------|
| GET    | /search       | No   | Google Books search proxy + fallback |
| GET    | /trending     | No   | Trending query proxy + fallback      |
| GET    | /:id          | No   | Single book details proxy            |

In-memory cache with 10-minute TTL. Falls back to 14 hardcoded books on API failure.

### AI (`/api/ai`)
| Method | Path       | Auth | Description                      |
|--------|------------|------|----------------------------------|
| POST   | /recommend | No   | Mood → Google Books query mapper |
| POST   | /chat      | No   | Rule-based pattern-matching bot  |

### Logs (`/api/logs`)
| Method | Path                   | Auth | Description                   |
|--------|------------------------|------|-------------------------------|
| GET    | /                      | Yes  | Current user's logs           |
| GET    | /community             | No   | Recent public logs with notes |
| GET    | /book/:bookId/community| No   | Public logs for a book        |
| GET    | /user/:username        | No   | Public profile logs           |
| POST   | /                      | Yes  | Create a book log             |
| DELETE | /:id                   | Yes  | Delete own log                |

### DNA (`/api/dna`)
| Method | Path | Auth | Description                          |
|--------|------|------|--------------------------------------|
| GET    | /    | Yes  | Stats, badges, genres, recent books  |

### Friends (`/api/friends`)
| Method | Path    | Auth | Description                      |
|--------|---------|------|----------------------------------|
| GET    | /       | Yes  | List friends with log counts     |
| POST   | /add    | Yes  | Add friend by username (mutual)  |

## Socket.io — `server/socket/chat.js`

- JWT auth on handshake (socket.handshake.auth.token)
- Events: `join_room`, `send_message`, `typing_start`, `typing_stop`, `disconnect`
- Messages persisted to DB, last 50 sent on room join
- Room stats (online count) broadcast on join/disconnect
- 1000-char message limit enforced server-side

## Middleware Flow

```
Request → CORS → JSON → Route Handler → [requireAuth] → Controller → Response
```

## Configuration (Environment Variables)

| Variable            | Default                  | Used For                    |
|---------------------|--------------------------|-----------------------------|
| DATABASE_URL        | (required)               | PostgreSQL connection       |
| JWT_SECRET          | 'fallback_secret'        | Token signing               |
| GOOGLE_BOOKS_API_KEY| (empty)                  | Books API (optional)        |
| CLIENT_URL          | http://localhost:5173     | CORS origin                 |
| PORT                | 5000                     | HTTP server port            |
| RENDER_EXTERNAL_URL | (empty)                  | Self-ping URL               |
