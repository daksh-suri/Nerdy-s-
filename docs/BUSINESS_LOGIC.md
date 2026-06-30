# Business Logic & Feature Guide

## Core Domain

Nerdy's is a **social reading tracker** that lets users:
1. Search/discover books (via Google Books API)
2. Log books they've read (rating, date, notes, spoiler flag)
3. Favorite books
4. Chat with other readers (real-time, room-based)
5. View reading analytics ("Reading DNA")
6. Get AI-powered book recommendations (mood-based + chatbot)

## Feature Walkthrough

### 1. Home Page (`/`)
- Shows hero section with CTA to register or welcome back for auth users
- "Book of the Day" — deterministic pick from fetched bestsellers (based on day of year)
- Genre rows (Fiction, Mystery, Sci-Fi, Fantasy, Romance, History)
- Community buzz section with rotating reviews
- Recently viewed books (from localStorage)
- Animated global stats (hardcoded numbers, not live)

### 2. Search (`/search?q=...`)
- Calls backend proxy to Google Books API
- Shows "Best Match" hero card + grid of related results
- Falls back to empty state with message

### 3. Book Details (`/book/:id`)
- Fetches book info from Google Books via backend proxy
- Spoiler-controlled description reveal
- "Log this Book" button → LogBook modal
- "Add to Favorites" toggle
- Personal logs section (if user has logged this book)
- Community reviews section (public logs with notes for this book)
- Tracks recent views in localStorage (last 10)

### 4. Trending (`/trending`)
- Genre filter pills + horizontal scroll rows
- Same layout as genre rows on Home
- "Instant-load" — shows static books immediately, fetches API in background

### 5. Favorites (`/favorites`)
- Lists user's favorited books
- Empty state with decorative elements and CTAs

### 6. Journal (`/journal`)
- Shows all user's book logs with stats (total, avg rating, reviews written)
- Links to book details and public profile
- Auth-gated

### 7. User Profile (`/user/:username`)
- **BUG**: Only shows current user's logs regardless of `:username` param
- Shows avatar, stats, list of logged books with ratings

### 8. AI Book Concierge (`/ai-recommend`)
- **Tab 1: Mood Finder** — Select mood + time commitment → Google Books search
- **Tab 2: AI Librarian Chat** — Rule-based chatbot (pattern matching, no AI API)
- Voice input (Web Speech API) + TTS output

### 9. Community (`/community` or `/community/:slug`)
- Auth-gated chat page
- Sidebar with 7 seeded chat rooms
- Active room shows ChatRoom component with live messaging

### 10. Reading DNA (`/dna`)
- Gaming-themed analytics dashboard
- **Tabs**: Overview, Stats, Friends, Achievements
- Stats computed server-side:
  - Books read this year
  - Average rating
  - Current streak (consecutive days logged)
  - Monthly heatmap
- Badges: Night Owl, Weekender, 7-Day Streak, 30-Day Streak
- Genre distribution (mocked, deterministic pseudo-random)
- Friends list + add friend form
- Edit bio modal

## Reading Streak Algorithm

Located in `server/routes/dna.js`:

1. Sort logs by `dateRead` descending
2. Check if most recent log is today or yesterday → streak starts at 1
3. Walk backwards through dates, incrementing streak for each consecutive day
4. Break on gap, duplicate dates are ignored

## Friend System

- Add by username (case-insensitive check against self)
- Bi-directional "friendship" — both users connected
- No request/accept flow — immediate addition
- **Schema gap**: No `friends` relation defined in Prisma schema

## AI Librarian Chat

A rule-based system with ~20 intents matched via regex:
- Greetings, thanks, goodbye
- "recommend", "summary", "character", "thriller", "romance", "fantasy", etc.
- Genre-specific book suggestions (hardcoded)
- Catch-all default with help text
- No LLM/API involved

## Known Business Logic Issues

1. **Friends relation missing from schema** — friends route will crash at runtime
2. **Bio field missing from schema** — profile update may fail
3. **UserProfile always shows current user** — uses wrong API endpoint
4. **Genre data is mocked** — no genre tracking on BookLog model
5. **Community reviews on BookDetails only show current user** — the "community" section reuses `getBookLogs` (current user) instead of `getBookCommunityLogs` on initial load... actually looking again, it does call both. This seems correct.
