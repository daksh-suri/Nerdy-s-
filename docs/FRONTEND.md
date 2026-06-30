# Frontend (React 19 + TypeScript + Vite)

## Entry & Routing

- `src/main.tsx` — mounts `<App />` in StrictMode
- `src/App.tsx` — wraps everything in `AuthProvider` → `BrowserRouter` → `Layout` → `Routes`
- 12 routes defined, all public (auth state checked inside pages)

## Component Tree

```
App
├── AuthProvider (context)
│   └── Router
│       └── Layout
│           ├── Navbar (sticky, responsive, search, auth controls)
│           ├── <Routes>
│           │   ├── / → Home
│           │   ├── /search → SearchResults
│           │   ├── /book/:id → BookDetails
│           │   ├── /trending → Trending
│           │   ├── /favorites → Favorites
│           │   ├── /ai-recommend → AiRecommend (Mood Finder + AI Librarian)
│           │   ├── /login → Login
│           │   ├── /register → Register
│           │   ├── /journal → Journal
│           │   ├── /user/:username → UserProfile
│           │   ├── /community → Community (chat rooms)
│           │   ├── /community/:slug → Community (specific room)
│           │   └── /dna → ReadingDNA
│           └── Footer
│           └── FloatingAIBot (FAB → /ai-recommend)
```

## Component Layers

### UI Components (`components/ui/`)
- **BookCard** — linked thumbnail card with star rating
- **GenreScrollRow** — horizontal scrollable row with left/right nav buttons
- **FloatingAIBot** — animated FAB that navigates to AI recommend page
- **GoogleLoginButton** — renders Google GSI button, polls for script load

### Feature Components (`components/features/`)
- **ChatRoom** — full chat UI: messages list, input, typing indicators, online count
- **LogBook** — modal form for logging a book (rating, date, notes, spoiler flag)

### Layout Components (`components/layout/`)
- **Layout** — wraps main content with Navbar, Footer, FloatingAIBot
- **Navbar** — responsive, desktop/mobile, search form, auth buttons
- **Footer** — brand info + social links

## State Management

All state is local (`useState`) or context:
- **AuthContext** — the only global context. Provides:
  - `user`, `isAuthenticated`, `loading`
  - `login()`, `loginWithGoogle()`, `register()`, `logout()`
- JWT stored in `localStorage` under key `nerdys_token`

Two localStorage keys used:
- `nerdys_token` — JWT
- `nerdys_recent_views` — last 10 book IDs viewed

## API Communication

Two API layers exist (see ARCHITECTURE.md for the duplication issue):

### apiClient.ts (primary, used by most pages)
- `api.get<T>(path)`, `api.post<T>(path, body)`, `api.delete<T>(path)`
- 3 retries with exponential backoff (2s → 4s → 8s)
- 30-second timeout with AbortController
- Only retries on network/timeout errors, not 4xx/5xx
- Auto-attaches `Authorization: Bearer <token>`

### api.ts (secondary, book-related + legacy)
- `searchBooks(query)`, `fetchTrendingBooks()`, `getBookDetails(id)`
- `fetchWithRetry()` helper (2 retries, 3s backoff)
- Also contains `getStarterBooks(genre)` → `staticBooks.ts`
- Legacy `api.get/post` helpers duplicate apiClient.ts

### storage.ts (API wrappers)
- `saveBookLog()`, `getUserLogs()`, `getAllLogs()`
- `getBookLogs()`, `getBookCommunityLogs()`
- `getFavorites()`, `isFavorite()`, `toggleFavorite()`

## Socket.io Client — `lib/socket.ts`

- Singleton socket instance (lazy init with JWT auth)
- `useChatRoom(slug)` hook returns:
  - `messages`, `onlineCount`, `connected`, `typingUsers`
  - `sendMessage()`, `startTyping()`, `stopTyping()`
- Auto-joins room on connect, cleans up listeners on unmount
- Transports: websocket (preferred) + polling (fallback)

## Authentication Flow

1. User logs in → server returns `{ user, token }`
2. Token stored in `localStorage`, user set in context
3. On mount, `AuthProvider` checks for existing token and calls `GET /api/auth/me`
4. On logout, token removed, user set to null
5. Google OAuth: GSI credential JWT → `POST /api/auth/google` → server verifies using Google's public certs

## Styling

- All vanilla CSS with CSS custom properties (no Tailwind)
- 7 CSS files in `src/styles/`:
  - `layout.css` — navbar, footer, layout grid
  - `pages.css` — home, trending, search, book details, login/register, journal, profile
  - `components.css` — book card, genre scroll row, chat room, log book, floating bot
  - `favorites.css` — favorites page
  - `ai-chat.css` — AI recommend page
  - `dna-gaming.css` — reading DNA page
  - `pages_recovered.css` — unknown/disused
- `index.css` — global resets, CSS variables, utility classes

## Known Issues

1. **UserProfile calls wrong endpoint.** `getUserLogs(username)` fetches from
   `/api/logs` (current user) instead of `/api/logs/user/:username` (target user).
   The server route exists but the client never uses it.

2. **GoogleLoginButton polls at 200ms interval** for the GSI script. Fragile if
   the script fails to load. No fallback UI.

3. **CSS files are large and duplicate** — many inline styles used in pages
   (especially Home.tsx) alongside CSS classes.
