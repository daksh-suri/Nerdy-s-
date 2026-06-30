# Project Context — Nerdy's

**Read this file at the beginning of every session. It provides essential context for making correct, architecture-consistent decisions.**

---

## 1. Project Overview

Nerdy's is a **social reading tracker** — a full-stack web app where users discover books, log what they've read, write reviews, favorite books, chat with other readers in real-time, and view gamified reading analytics ("Reading DNA").

**Current state**: Functional prototype deployed on Render (server) + Vercel (client). All core features work, but several schema-level bugs exist (see §8). No test suite. No CI/CD beyond build scripts. Active development on `refactor/structure` branch.

---

## 2. Tech Stack

| Layer | Tech | Details |
|-------|------|---------|
| Frontend | React 19 + TypeScript + Vite 7 | `@/` path alias |
| Styling | Vanilla CSS + CSS custom properties | No Tailwind. 7 CSS files in `client/src/styles/` |
| Backend | Express 5 + Node.js (ESM) | 9 route modules, `server/index.js` entry |
| Database | PostgreSQL + Prisma ORM 7 | `@prisma/adapter-pg`. Schema: `server/prisma/schema.prisma` |
| Auth | JWT (bcryptjs + jsonwebtoken) + Google OAuth (GSI) | Token in `localStorage` key `nerdys_token` |
| Realtime | Socket.io 4 (server) + socket.io-client 4 (client) | Chat only. JWT auth on handshake |
| External API | Google Books v1 | Proxied through backend at `/api/books/*` |
| Charts | recharts | Used only on Reading DNA page |
| Icons | lucide-react | |
| Hosting | Render (server) + Vercel (client) | |

See `docs/ARCHITECTURE.md` for full stack breakdown.

---

## 3. Architecture Summary

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│  React SPA   │ ──►   │  Express API     │ ──►   │  PostgreSQL  │
│  (Vercel)    │ ◄──   │  (Render)        │ ◄──   │  (Render)    │
└──────────────┘       └──────────────────┘       └──────────────┘
       │                      │                          │
       │ Socket.io ───────────┘                          │
       │ (real-time chat)                                │
       │                                                 │
       │                      ┌──────────────────┐       │
       │                      │  Google Books API │       │
       └─────────(/api/books)─►  (external)       │       │
                              └──────────────────┘       │
```

**Major subsystems** (each documented in `docs/`):

| Subsystem | Location | Docs |
|-----------|----------|------|
| Auth (email + Google OAuth) | `server/routes/auth.js` + `client/src/lib/AuthContext.tsx` | `docs/BACKEND.md`, `docs/FRONTEND.md` |
| Book discovery (search, trending, details) | `server/routes/books.js` + `client/src/lib/api.ts` | `docs/BACKEND.md` |
| Book logging & reviews | `server/routes/logs.js` + `client/src/lib/storage.ts` | `docs/BUSINESS_LOGIC.md` |
| Favorites | `server/routes/favorites.js` + `client/src/lib/storage.ts` | `docs/BUSINESS_LOGIC.md` |
| Real-time chat | `server/socket/chat.js` + `client/src/lib/socket.ts` | `docs/DATA_FLOW.md` |
| Reading DNA / analytics | `server/routes/dna.js` + `client/src/pages/ReadingDNA.tsx` | `docs/BUSINESS_LOGIC.md` |
| AI librarian (rule-based) | `server/routes/aiRoutes.js` + `client/src/pages/AiRecommend.tsx` | `docs/BUSINESS_LOGIC.md` |
| Friends | `server/routes/friends.js` | `docs/DATABASE.md` (schema gap) |
| Profile | `server/routes/profile.js` | `docs/DATABASE.md` (schema gap) |

**Interactions**: Pages fetch data from the backend API. Book data is proxied through the backend to avoid CORS. Chat uses WebSocket via Socket.io. Auth state is managed globally via React Context. No server-side rendering — pure SPA.

---

## 4. Important Directories

| Directory | Responsibility |
|-----------|---------------|
| `client/src/components/features/` | Domain-specific feature components (ChatRoom, LogBook) |
| `client/src/components/layout/` | Page shell (Layout, Navbar, Footer) |
| `client/src/components/ui/` | Reusable UI primitives (BookCard, GenreScrollRow, FloatingAIBot, GoogleLoginButton) |
| `client/src/lib/` | API clients, auth context, socket client, utility functions |
| `client/src/pages/` | One file per route. Each page is a self-contained view |
| `client/src/styles/` | Vanilla CSS files. One per major feature area |
| `server/routes/` | One file per API domain (auth, books, logs, etc.) |
| `server/middleware/` | `auth.js` — JWT verification middleware |
| `server/socket/` | `chat.js` — Socket.io event handlers |
| `server/prisma/` | `schema.prisma` — the single source of truth for the database |
| `docs/` | Detailed subsystem documentation |

---

## 5. Coding Conventions

**Always follow these patterns when making changes:**

### General
- **No comments in code** unless the logic is genuinely non-obvious. The codebase has almost no comments — preserve this style.
- **No emojis** in code or file content unless present in existing patterns (emoji is used in seed data and some UI text).
- **Minimal changes** — prefer small, targeted edits over refactoring. If existing code has quirks, document the fix rather than rewriting.

### Frontend (React + TypeScript)
- **State management**: Local `useState` for page-level state. `AuthContext` (single global context) for auth only. No Redux, Zustand, etc.
- **API calls**: Use `apiClient.ts` (`api.get<T>()`, `api.post<T>()`, `api.delete<T>()`) for authenticated endpoints. Use `api.ts` (`searchBooks`, `fetchTrendingBooks`, `getBookDetails`) for book data. **Do not add a third client**.
- **Routing**: All routes are public. Auth gating happens inside page components (check `isAuthenticated`, show prompt or content).
- **Imports**: Use `@/` alias for `client/src/`. Prefer named exports.
- **CSS**: Use `styles/` CSS files with class names. Avoid inline styles for new code — the existing codebase has many inline styles (legacy), but new additions should use CSS classes.
- **Components**: One component per file. Functional components only.

### Backend (Express + Node.js)
- **Route structure**: One Express router per domain file in `routes/`. Each file exports a `router`. Mounted in `index.js` at `/api/<domain>`.
- **Auth middleware**: Use `requireAuth` from `middleware/auth.js` for protected routes. Import `prisma` from `../index.js` (singleton).
- **Error handling**: Try/catch in each route handler. Return `res.status(500).json({ error: 'Server error' })` for unexpected errors with `console.error`.
- **Async/await** everywhere. No callbacks or raw promises.

### Database
- **Prisma client**: Import from `../index.js` (single shared instance). Never instantiate `PrismaClient` in route files.
- **Schema changes**: Edit `server/prisma/schema.prisma` only. No migration files — use `prisma db push` for dev.
- **Integer IDs** (autoincrement). Not UUIDs. Preserve this pattern.

### Validation
- Server-side: Basic existence checks (`if (!field) return 400`). Email format regex. No validation library.
- Client-side: Form-level validation before submit. Password strength requirements on register page.
- **No zod, joi, or validation library**. Keep validation minimal and inline.

---

## 6. Development Workflow

See `docs/DEPLOYMENT.md#complete-local-development-setup` for the full step-by-step guide including PostgreSQL setup, environment files, and credential generation.

| Action | Command |
|--------|---------|
| Install dependencies | `cd server && npm install` then `cd ../client && npm install` |
| Start server (dev) | `cd server && npm run dev` (nodemon, :5000) |
| Start client (dev) | `cd client && npm run dev` (Vite, :5173) |
| TypeScript check | `cd client && npx tsc -b` |
| Lint client | `cd client && npm run lint` |
| Sync DB schema | `cd server && npx prisma db push` |
| Open DB browser | `cd server && npx prisma studio` (:5555) |
| Generate Prisma client | `cd server && npx prisma generate` |
| Seed test data | `cd server && node run_seed.js` |
| Build client | `cd client && npm run build` |
| Test books API | `node test_books.mjs` |

**No test suite exists.** `npm test` on the server is a placeholder. New features should be verified manually.

**Required services**: PostgreSQL (local or Docker) + optional Google Books API key + optional Google OAuth client ID. See `docs/DEPLOYMENT.md` for how to obtain each credential.

---

## 7. Important Rules

**Never change these without careful consideration:**

1. **Books API proxy** (`/api/books/*`) — All Google Books requests must go through the backend. Direct client-to-Google-API calls would break on college/corporate networks. If you add a new book-related endpoint, it must be proxied.

2. **Auth token key** (`nerdys_token`) — Both `apiClient.ts` and `api.ts` read from this localStorage key. Changing it breaks auth everywhere.

3. **Prisma client singleton** (`server/index.js` export) — Routes import `prisma` from `index.js`. Never create a second `PrismaClient` instance — it causes connection pool issues.

4. **Instant-load fallback pattern** — `staticBooks.ts` provides immediate content while API calls are in-flight. If you add a new feature that fetches external data, mirror this pattern (show fast fallback, then replace with real data).

5. **Socket.io auth** — JWT is verified in `io.use()` middleware. The client sends the token in `handshake.auth.token`. Do not add alternative auth mechanisms for chat.

6. **Chat message length** — Enforced at 1000 chars in both client (`ChatRoom.tsx:143`) and server (`chat.js:63`). Both must agree.

7. **CORS origin** — Set from `CLIENT_URL` env var in `server/index.js:32,38`. Both `cors()` config and `io` config must be updated together if the client URL changes.

---

## 8. Known Technical Debt

See `docs/BUGS_AND_UNCERTAINTIES.md` for full details. Critical issues:

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | `bio` field missing from User schema — `PUT /api/profile` will crash | `server/prisma/schema.prisma` + `server/routes/profile.js` | **CRITICAL** |
| 2 | Friends relation missing from User schema — friends routes will crash | `server/prisma/schema.prisma` + `server/routes/friends.js` | **CRITICAL** |
| 3 | UserProfile always shows current user's logs | `client/src/lib/storage.ts:31` + `client/src/pages/UserProfile.tsx:17` | **HIGH** |
| 4 | Duplicate API client layers (api.ts vs apiClient.ts) | `client/src/lib/api.ts` + `client/src/lib/apiClient.ts` | **LOW** (maintenance burden) |

**Areas requiring extra caution:**
- `docs/DATABASE.md` — schema has 4 confirmed gaps. Any new feature touching User, BookLog, or friends must fix these first.
- `docs/DEPLOYMENT.md` — cold-start mitigation logic is spread across 4 mechanisms. Don't remove any without understanding the full chain.
- `docs/FRONTEND.md` — CSS is duplicated across 7 files with inline styles in pages. Avoid making CSS worse; prefer class-based over inline.

---

## 9. Current Project Status

### Implemented
- Email registration & login with bcrypt + JWT
- Google OAuth sign-in/sign-up
- Book search, trending, details (Google Books API proxy)
- Instant-load fallback with 40+ static books
- Book logging (rating, date, notes, spoiler flag)
- Favorites (add/remove, list)
- Real-time chat (7 rooms, Socket.io)
- Rule-based AI librarian chatbot (~20 intents)
- Mood-based book recommender
- Reading DNA dashboard (stats, streaks, badges, heatmap)
- Community reviews feed
- User public profiles (broken — see §8)
- Friends system (broken — see §8)
- Responsive design (desktop + mobile)
- Render free-tier cold-start mitigations

### Not Implemented / Uncertain
- No test suite
- No CI pipeline
- No proper database migrations (uses `prisma db push`)
- No genre tracking on book logs (mocked in DNA)
- No list/book-club features
- No notification system
- No email verification flow
- No password reset flow
- No admin panel
- No rate limiting
- No proper error logging/monitoring

---

## 10. Guidance for Future AI Sessions

This file is read at the beginning of every session. Before making any change:

1. **Revisit `docs/`** — Check the relevant subsystem doc. Understand data flow, routes, and component relationships.
2. **Explain before editing** — State which feature area the change belongs to, what file(s) need modification, and why the approach is consistent with existing patterns.
3. **Minimize scope** — Change only the minimum number of files needed. Do not refactor unrelated code.
4. **Preserve style** — Follow the conventions in §5. If the codebase uses inline styles in one place, that doesn't mean new code should. If the codebase has no tests, don't add a test framework without asking.
5. **Check side effects** — Consider:
   - Will a schema change break existing routes?
   - Will a client change break the server's expected request format?
   - Will a CSS change affect unrelated pages (CSS is global, no modules)?
   - Will a library upgrade break existing imports?
6. **Bugs first** — If a change touches an area with a known bug (§8), fix the bug as part of the change rather than working around it.
7. **Document uncertainty** — If something is unclear after investigation, mark it explicitly rather than guessing. Add to `docs/BUGS_AND_UNCERTAINTIES.md` if appropriate.

**Remember**: This is a prototype on Render's free tier. Cold starts are normal. The app is designed to degrade gracefully when external APIs are unavailable.
