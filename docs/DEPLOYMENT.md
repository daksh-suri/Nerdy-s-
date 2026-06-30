# Deployment & Configuration

## Hosting

| Service | Target       | URL Pattern                  |
|---------|--------------|------------------------------|
| Render  | Server (API) | `https://nerdys.onrender.com`|
| Vercel  | Client (SPA) | Custom domain / vercel.app   |

## Server Deploy (Render)

**Start Command**: `npm run build && npm start`

The `build` script runs:
```
npm install && npx prisma generate && npx prisma db push --skip-generate
```

Key considerations:
- `prisma db push` syncs schema without migrations (intentional for prototyping)
- Database is likely a Render PostgreSQL instance
- Keep-alive: self-pings `GET /ping` every 14 minutes (Render free tier spins down after 15 min of inactivity)
- `RENDER_EXTERNAL_URL` env var used for self-ping URL

## Client Deploy (Vercel)

- Built with `tsc -b && vite build`
- Output dir: `dist`
- `vercel.json` contains SPA fallback (rewrite all routes to `index.html`)
- `VITE_API_URL` env var points to Render server URL
- `VITE_GOOGLE_CLIENT_ID` for Google OAuth

---

## Complete Local Development Setup

### Prerequisites

| Dependency     | Version | How to verify            | How to install                                         |
|----------------|---------|--------------------------|--------------------------------------------------------|
| Node.js        | ^20+    | `node --version`         | [nodejs.org](https://nodejs.org/) or `nvm` / `fnm`     |
| npm            | ^10+    | `npm --version`          | Comes with Node.js                                     |
| PostgreSQL     | ^14+    | `psql --version`         | [postgresql.org/download](https://www.postgresql.org/download/) or Docker |

**No `.nvmrc` or `engines` field is set** — Node.js 20+ is recommended but any modern version may work.

### Step 1: Clone and Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Step 2: Set Up PostgreSQL

You need a running PostgreSQL instance. Any of these options work:

**Option A — Local install** (recommended for first-time setup):
```bash
# macOS (Homebrew)
brew install postgresql@16 && brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql && sudo systemctl start postgresql

# Windows — use the installer from https://www.postgresql.org/download/windows/
```

**Option B — Docker** (if you have Docker):
```bash
docker run -d \
  --name nerdys-postgres \
  -e POSTGRES_USER=nerdys \
  -e POSTGRES_PASSWORD=nerdys \
  -e POSTGRES_DB=nerdys \
  -p 5432:5432 \
  postgres:16
```

**Option C — Cloud PostgreSQL** (Neon, Render, Aiven, etc.):
Provision a free-tier instance and copy the connection string.

After PostgreSQL is running, create the database:
```bash
createdb nerdys
# Or via psql:
# psql -c "CREATE DATABASE nerdys;"
```

### Step 3: Create Environment Files

Both the `server/` and `client/` directories need a `.env` file.

#### `server/.env`

```env
# ── Required ──────────────────────────────────────────────
DATABASE_URL=postgresql://nerdys:nerdys@localhost:5432/nerdys
  # PostgreSQL connection string from Step 2.
  # Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
  # Local Docker default: postgresql://nerdys:nerdys@localhost:5432/nerdys

JWT_SECRET=change-me-to-a-random-string-at-least-32-chars
  # Secret key for signing JSON Web Tokens.
  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

CLIENT_URL=http://localhost:5173
  # Frontend origin for CORS and Socket.io permissions.
  # Change if your Vite dev server uses a different port.

# ── Optional ─────────────────────────────────────────────
GOOGLE_BOOKS_API_KEY=
  # Google Books API key. Without it, the app uses 14 hardcoded fallback books.
  # Get one: https://console.cloud.google.com/apis/library/books.googleapis.com

PORT=5000
  # Server port. Defaults to 5000 if omitted.

RENDER_EXTERNAL_URL=
  # Only needed on Render. Controls the self-ping URL. Ignored locally.
```

#### `client/.env`

```env
# ── Optional (reasonable defaults for local dev) ─────────
VITE_API_URL=http://localhost:5000
  # Backend API base URL. Defaults to http://localhost:5000 if omitted.

# ── Optional (Google OAuth won't work without this) ──────
VITE_GOOGLE_CLIENT_ID=
  # Google OAuth client ID for "Sign in with Google".
  # Get one: https://console.cloud.google.com/apis/credentials
```

### Step 4: Generate Prisma Client and Sync Schema

```bash
cd server
npx prisma generate     # Generate Prisma client from schema
npx prisma db push      # Push schema to PostgreSQL (creates tables)
npx prisma studio       # (optional) Opens GUI at http://localhost:5555
```

### Step 5: Start the Server

```bash
cd server
npm run dev             # Starts with nodemon on :5000
```

Verify: `curl http://localhost:5000/ping` should return `{ "status": "ok", "time": "..." }`.

### Step 6: Start the Client

In a separate terminal:

```bash
cd client
npm run dev             # Vite dev server on :5173
```

Open `http://localhost:5173` in a browser.

### Step 7: Create a User and Verify

1. Go to `http://localhost:5173/register` and create an account.
2. After registering, you'll be redirected to the home page.
3. Browse books, log a read, add favorites, try the chat.

---

## Environment Variables Reference

### Server (11 total usages across 8 files)

These are sourced from `server/.env` (loaded by `dotenv/config` at import time).

| Variable | Required | Default | Used in files | Purpose |
|----------|----------|---------|---------------|---------|
| `DATABASE_URL` | **Yes** | none | `index.js:23`, `debug_api.js:8`, `run_seed.js:7`, `seed_logs.js:7` | PostgreSQL connection string |
| `JWT_SECRET` | **Yes**† | `'fallback_secret'` | `middleware/auth.js:4`, `routes/auth.js:8`, `socket/chat.js:3`, `debug_api.js:17` | HMAC key for signing JWTs |
| `CLIENT_URL` | **Yes**‡ | `'http://localhost:5173'` | `index.js:32,38` | CORS origin + Socket.io allowed origin |
| `GOOGLE_BOOKS_API_KEY` | No | `undefined` | `routes/books.js:6` | Google Books API key (app falls back to hardcoded books) |
| `PORT` | No | `5000` | `index.js:80` | HTTP server listen port |
| `RENDER_EXTERNAL_URL` | No | `http://localhost:{PORT}` | `index.js:91` | Self-ping URL for Render keep-alive |

† Required in production. The fallback `'fallback_secret'` is hardcoded and insecure — **always set a real secret**.

‡ Has a default that works for local development. In production, set this to your deployed frontend URL.

### Client (5 total usages across 4 files)

These are sourced from `client/.env` (embedded at build time by Vite).

| Variable | Required | Default | Used in files | Purpose |
|----------|----------|---------|---------------|---------|
| `VITE_API_URL` | No | `'http://localhost:5000'` | `lib/api.ts:3`, `lib/apiClient.ts:1`, `lib/socket.ts:9`, `pages/AiRecommend.tsx:164` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | No | `undefined` | `components/ui/GoogleLoginButton.tsx:8` | Google OAuth client ID. Button renders nothing if absent. |

---

## External Services: How to Obtain Credentials

### 1. PostgreSQL Database

**Purpose**: All application data (users, book logs, favorites, messages, chat rooms).

**Local**: Install PostgreSQL directly or use Docker (see Step 2).

**Production (Render)**: Created via Render Dashboard → New PostgreSQL. Connection string provided automatically.

**Alternative cloud**: [Neon](https://neon.tech) (free tier), [Aiven](https://aiven.io), [Supabase](https://supabase.com).

No configuration needed beyond the `DATABASE_URL` connection string.

### 2. Google Books API Key (optional)

**Purpose**: Powers book search, trending, and details pages. Without it, the app falls back to 14 hardcoded books.

**How to get one**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select existing).
3. Navigate to **APIs & Services → Library**.
4. Search for "Books API" and enable it.
5. Go to **APIs & Services → Credentials**.
6. Click **Create Credentials → API Key**.
7. (Optional but recommended) Restrict the key to the Books API only.
8. Copy the key into `GOOGLE_BOOKS_API_KEY` in `server/.env`.

**Cost**: Free with quota limits (1,000 requests/day without billing, higher with billing enabled).

### 3. Google OAuth Client ID (optional)

**Purpose**: Enables "Sign in with Google" button. Without it, the button renders nothing; users can still register with email/password.

**How to get one**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project (or create one).
3. Navigate to **APIs & Services → Credentials**.
4. Click **Create Credentials → OAuth client ID**.
5. Choose **Web application** as application type.
6. Set **Authorized JavaScript origins**:
   - `http://localhost:5173` (local dev)
   - `https://your-vercel-domain.vercel.app` (production)
7. Set **Authorized redirect URIs**:
   - (Not needed for GSI — the credential response is handled client-side via JS)
8. Copy the **Client ID** into `VITE_GOOGLE_CLIENT_ID` in `client/.env`.

**Cost**: Free.

**Note**: The Google Identity Services (GSI) script is loaded from `https://accounts.google.com/gsi/client` in `client/index.html:12`. No additional API key is needed for the client side.

---

## How to Generate Local Secrets

### JWT_SECRET

The JWT secret should be a cryptographically random string (at least 32 bytes / 64 hex chars):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This outputs a string like `a1b2c3d4e5f6...` — copy it into `JWT_SECRET` in `server/.env`.

**Never use the fallback `'fallback_secret'` in production.** Anyone who reads the source code knows the fallback and can forge tokens.

---

## Dead Dependencies (Unused Packages)

The following packages are listed in `server/package.json` but are **never imported** in any server code. They are safe to remove:

| Package | Added reason (speculative) |
|---------|---------------------------|
| `@google/generative-ai` | Possibly intended for AI features; the actual AI chat is rule-based |
| `mongoose` | Possibly intended for MongoDB before switching to Prisma/PostgreSQL |

---

## Frontend Cold-Start Mitigation

Render's free tier spins down after inactivity. The app uses several strategies:

1. **`wakeUpServer()`** — fire-and-forget `GET /ping` called in AuthProvider on mount
2. **Login/Register "warming up" hint** — shown after 5 seconds if no response
3. **Retry with backoff** — apiClient.ts: 3 retries, exponential backoff
4. **`fetchWithRetry`** — book API calls: 2 retries, linear backoff
5. **Instant-load fallback** — `staticBooks.ts` renders immediately, replaced by API data

---

## Manual Testing Scripts

| Script | Purpose | Prerequisites |
|--------|---------|---------------|
| `node test_books.mjs` | Test Google Books API connectivity directly | None (runs against live API) |
| `node server/debug_api.js` | Test `/api/dna` endpoint with latest user's token | Running server + database with at least one user |
| `node server/run_seed.js` | Seed 7 consecutive days of book logs for the most recently created user | Running server + database with at least one user |

## CI / Testing

- No CI pipeline configured
- No test suite (server `npm test` is a placeholder)
- ESLint configured for client (`npm run lint`)
- TypeScript check via `tsc -b` during build
