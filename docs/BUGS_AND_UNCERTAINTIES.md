# Known Bugs & Uncertainties

## Confirmed Bugs

### 1. User Profile Shows Wrong Data
**File**: `client/src/pages/UserProfile.tsx:17`
**Issue**: `getUserLogs(username)` calls the authenticated user's own `/api/logs` endpoint instead of the public `/api/logs/user/:username` endpoint. The server route exists at `server/routes/logs.js:61` but is never called from the client. The `getUserLogs` function in `storage.ts:31` always hits `/api/logs` with the auth token, ignoring the `username` parameter entirely.
**Impact**: Viewing another user's profile shows your own logs.

### 2. `bio` Field Missing from Prisma Schema
**Files**: `server/routes/profile.js:14`, `server/prisma/schema.prisma`
**Issue**: `PUT /api/profile` calls `prisma.user.update({ data: { bio } })` but `bio` is not defined on the `User` model in the schema.
**Impact**: Profile update will throw a Prisma error at runtime because the column doesn't exist.

### 3. Friends Relation Missing from Prisma Schema
**Files**: `server/routes/friends.js:12-14`, `server/prisma/schema.prisma`
**Issue**: The friends route queries `user.friends` with an include, suggesting a self-referential many-to-many relation. This relation is not defined in the Prisma schema.
**Impact**: `GET /api/friends` and `POST /api/friends/add` will likely crash with a Prisma error when accessing the friends relation.

### 4. Duplicate API Client Layers
**Files**: `client/src/lib/api.ts` (lines 22-47) and `client/src/lib/apiClient.ts`
**Issue**: Two nearly identical HTTP client implementations exist. `api.ts`'s `api.get/post` are used in `AuthContext.tsx` while `apiClient.ts`'s `api.get/post/delete` are used everywhere else. Both set `Content-Type` and attach Bearer tokens, but they handle errors differently.
**Impact**: Inconsistencies in error handling and potential duplicate maintenance.

## Uncertainties (Investigated but Inconclusive)

### U1: Google Books API Key Status
The backend code gracefully handles missing API keys (line 34 of books.js: `${API_KEY ? `&key=${API_KEY}` : ''}`). The app falls back to 14 hardcoded books when the API is unavailable. It's unclear whether a valid `GOOGLE_BOOKS_API_KEY` is configured in production or if the app runs entirely on fallback data.

### U2: Render Database Persistence
The app uses `prisma db push` (not migrations) on deploy. If the Render PostgreSQL instance is ephemeral or gets recreated, the schema would be re-pushed automatically. However, seed data (chat rooms) is re-seeded on every startup via upsert, while user data depends on database persistence.

### U3: Google OAuth Script Loading
`GoogleLoginButton.tsx` polls at 200ms intervals for the `window.google` object. If the GSI script fails to load (ad blocker, network issue), the button renders nothing silently (line 66: `if (!CLIENT_ID) return null`). There's no retry mechanism for the script itself — only a polling interval that never times out.

### U4: AI Chat Pattern Matching Coverage
The rule-based chatbot in `aiRoutes.js` has ~20 intent patterns. The final catch-all pattern (`/.*/`) ensures it always responds, but for unrecognized intents it returns generic help text. There's no feedback mechanism to identify gaps in the pattern coverage.

### U5: Production Environment Variables
No `.env.example` or documented env vars. The production values of `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_BOOKS_API_KEY`, and `JWT_SECRET` are unknown. The JWT falls back to `'fallback_secret'` which is insecure in production.
