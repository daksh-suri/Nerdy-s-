# Architecture Overview

## Stack

| Layer  | Technology                               |
| ------ | ---------------------------------------- |
| Frontend | React 19 + TypeScript + Vite           |
| Styling  | Vanilla CSS with CSS custom properties |
| Routing  | react-router-dom v7                    |
| Charts   | recharts                               |
| Icons    | lucide-react                           |
| Backend  | Express 5 + Node.js (ESM)              |
| Database | PostgreSQL via Prisma ORM              |
| Auth     | JWT (bcryptjs + jsonwebtoken)          |
| OAuth    | Google Identity Services (GSI)         |
| Realtime | Socket.io (chat)                       |
| Books API| Google Books v1                        |
| AI       | Rule-based chat bot (no external API)  |
| Hosting  | Render (server) + Vercel (client)      |

## Project Structure

```
Nerdy-s-/
├── client/          # React SPA (Vite + TS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── features/     # ChatRoom, LogBook
│   │   │   ├── layout/       # Layout, Navbar, Footer
│   │   │   └── ui/           # BookCard, GenreScrollRow, FloatingAIBot, GoogleLoginButton
│   │   ├── lib/
│   │   │   ├── api.ts         # Book search/fetch helpers (proxied via backend)
│   │   │   ├── apiClient.ts   # Generic HTTP client with retry/timeout
│   │   │   ├── AuthContext.tsx # Auth state management (React context)
│   │   │   ├── mockData.ts    # Legacy mock books
│   │   │   ├── socket.ts      # Socket.io client + useChatRoom hook
│   │   │   ├── staticBooks.ts # Instant-load fallback book catalog
│   │   │   ├── storage.ts     # API wrappers for logs & favorites
│   │   │   └── utils.ts       # cn() utility (clsx)
│   │   ├── pages/            # 12 route pages
│   │   └── styles/           # CSS files (7 files)
│   ├── vite.config.ts        # @ alias, React plugin
│   └── vercel.json           # SPA fallback for Vercel
├── server/          # Express API
│   ├── middleware/auth.js     # JWT verification middleware
│   ├── routes/               # 9 route modules
│   ├── socket/chat.js        # Socket.io chat handlers
│   ├── prisma/schema.prisma  # Database schema
│   ├── index.js              # Entry point
│   ├── debug_api.js          # Dev debugging script
│   ├── run_seed.js           # Seed dummy data for testing
│   └── seed_logs.js          # Another seed variant
├── test_books.mjs            # Manual Google Books API test
└── docs/                     # This directory
```

## Key Architectural Decisions

1. **Books are proxied through the backend** (`/api/books/*`) to avoid CORS and
   network-blocking issues on college/corporate networks.

2. **Two API client layers** exist in the frontend:
   - `apiClient.ts` — generic HTTP client with retry logic (3 retries, exponential
     backoff, 30s timeout), used for all auth-required endpoints.
   - `api.ts` — legacy layer that duplicates some of this; also has `searchBooks`,
     `fetchTrendingBooks`, `getBookDetails` which hit the backend proxy.

3. **Instant-load fallback**: `staticBooks.ts` provides 40+ hardcoded books across
   7 genres. Both Home and Trending show these immediately before API results arrive.

4. **Chat uses Socket.io** for real-time messaging with JWT auth on the handshake.
   Only last 50 messages are loaded per room.

5. **No actual AI API is used**. The "AI Librarian Chat" (`/api/ai/chat`) is a
   rule-based pattern matcher with ~20 predefined intents and a catch-all default.

6. **Reading DNA** is computed server-side from book logs and generates deterministic
   pseudo-random genre distributions (since genres aren't stored per-log in the schema).

## Known Design Quirks

- `mockData.ts` is imported only by `BookCard.tsx` (for its `Book` type), but the
  actual book data flows through `api.ts`'s `Book` interface. These types are nearly
  identical but defined separately.
- The `api.ts` `api.get/post` helper is redundant with `apiClient.ts` but is still
  used in some places (notably `AuthContext.tsx`).
- `UserProfile.tsx` uses `getUserLogs(username)` which calls the current user's own
  `/api/logs` endpoint and **filters client-side**. The endpoint doesn't actually accept
  a username parameter for other users' logs — there's a separate `/api/logs/user/:username`
  route on the server for public profiles, but the client never calls it.
- Prisma schema uses `@default(autoincrement())` for IDs (integers), not UUIDs.
