# Data Flow Diagrams

## Book Discovery Flow
```
User
  │
  ├─→ Home / Trending page mounts
  │     │
  │     ├─→ [Instant] Show staticBooks.ts (40+ hardcoded books)
  │     │
  │     └─→ [Async] fetchTrendingBooks(query) / searchBooks(query)
  │              │
  │              └─→ GET /api/books/search?q=... (BACKEND PROXY)
  │                     │
  │                     ├─→ [Cache hit]  ← Return cached result
  │                     └─→ [Cache miss]
  │                            └─→ fetch(Google Books API)
  │                                   │
  │                                   ├─→ [Success] → formatBook() → cache → return
  │                                   └─→ [Fail]    → getFallbackBooks() → return
  │
  └─→ GenreScrollRow renders with loaded data
```

## Book Logging Flow
```
User clicks "Log this Book"
  │
  ├─→ [Not authenticated] → Auth modal → Login/Register
  │
  └─→ [Authenticated] → LogBook modal opens
        │
        ├─→ Set rating (1-5), date, notes, spoiler flag
        │
        └─→ Submit → POST /api/logs
               │
               ├─→ [Success] → Refresh logs on page
               │
               └─→ requireAuth middleware validates JWT
                      → prisma.bookLog.create(...)
```

## Authentication Flow
```
User submits login form
  │
  └─→ POST /api/auth/login { email, password }
         │
         ├─→ prisma.user.findUnique({ where: { email } })
         │     ├─→ No user → 401
         │     └─→ Found
         │           ├─→ No passwordHash (Google-only) → 401 with hint
         │           └─→ bcrypt.compare(password, hash)
         │                 ├─→ Fail → 401
         │                 └─→ Pass → jwt.sign({ userId })
         │                        → Return { user, token }
         │
         └─→ Client stores token in localStorage
              → Sets user in AuthContext
              → Redirects to Home
```

## Real-Time Chat Flow
```
Client connects Socket.io
  │
  ├─→ io.use(): Verify JWT from handshake auth
  │     ├─→ Invalid → disconnect
  │     └─→ Valid → socket.userId = payload.userId
  │
  ├─→ socket.on('join_room', slug)
  │     ├─→ Leave previous rooms
  │     ├─→ prisma.chatRoom.findUnique({ slug })
  │     ├─→ socket.join(slug)
  │     ├─→ Load last 50 messages from DB
  │     ├─→ Send message_history to client
  │     └─→ Broadcast room_stats (online count)
  │
  ├─→ socket.on('send_message', content)
  │     ├─→ Validate (non-empty, ≤1000 chars)
  │     ├─→ prisma.message.create({ content, userId, roomId })
  │     └─→ io.to(room).emit('new_message', formatted)
  │
  └─→ socket.on('disconnect')
        └─→ Broadcast updated room_stats
```

## Reading DNA Computation Flow
```
Client navigates to /dna
  │
  ├─→ [Not authenticated] → "Sign in to view" prompt
  │
  └─→ [Authenticated]
        │
        ├─→ GET /api/dna (with Bearer token)
        │     ├─→ requireAuth middleware
        │     ├─→ prisma.bookLog.findMany({ userId })
        │     ├─→ Compute stats:
        │     │     ├─ booksReadThisYear (dateRead starts with current year)
        │     │     ├─ avgRating (sum / count)
        │     │     ├─ currentStreak (consecutive days back from today/yesterday)
        │     │     ├─ heatmap (monthly counts for current year)
        │     │     ├─ nightOwl badge (>30% logs between 23:00-04:00)
        │     │     └─ weekendWarrior badge (>50% logs on Sat/Sun)
        │     ├─→ Mock genres (deterministic hash of userId + logCount)
        │     └─→ Return { stats, badges, genres, recentBooks }
        │
        └─→ Render ReadingDNA dashboard
             ├─→ Overview tab: streaks, badges, recent book, rank cards
             ├─→ Stats tab: heatmap, charts, genre radar
             ├─→ Friends tab: add friend form, friend list
             └─→ Achievements tab: all badges with progress
```

## External API Calls

### Google Books API
```
Backend ──→ GET https://www.googleapis.com/books/v1/volumes
               ?q=...
               &maxResults=N
               &orderBy=relevance|newest
               &langRestrict=en
               &key=API_KEY (optional)
```

### Google OAuth
```
Client ──→ Google GSI script (accounts.google.com/gsi/client)
              └─→ Renders "Sign in with Google" button
Client ──→ Receives credential JWT from Google
Client ──→ POST /api/auth/google { credential }

Server ──→ GET https://www.googleapis.com/oauth2/v3/certs
              └─→ Fetches public keys to verify credential JWT
```
