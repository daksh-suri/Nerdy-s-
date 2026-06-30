# Database Schema (PostgreSQL via Prisma)

## Models

### User
| Field         | Type     | Notes                        |
|---------------|----------|------------------------------|
| id            | Int (PK) | autoincrement                |
| username      | String   | unique                       |
| email         | String   | unique                       |
| passwordHash  | String?  | null for Google OAuth users  |
| googleId      | String?  | unique, null for email users |
| createdAt     | DateTime | default now()                |

Relations: has many `BookLog`, `Favorite`, `Message`
Missing: `bio` (used in PUT /api/profile but not in schema —**this is a bug**)

### BookLog
| Field       | Type     | Notes                        |
|-------------|----------|------------------------------|
| id          | Int (PK) | autoincrement                |
| bookId      | String   | Google Books volume ID       |
| bookTitle   | String?  |                              |
| coverUrl    | String?  |                              |
| author      | String?  |                              |
| rating      | Int      | 1-5 scale                    |
| dateRead    | String   | YYYY-MM-DD format            |
| notes       | String   | default ""                   |
| hasSpoilers | Boolean  | default false                |
| createdAt   | DateTime | default now()                |
| userId      | Int (FK) | references User.id           |

### Favorite
| Field     | Type     | Notes               |
|-----------|----------|---------------------|
| id        | Int (PK) | autoincrement       |
| bookId    | String   |                     |
| bookTitle | String?  |                     |
| coverUrl  | String?  |                     |
| author    | String?  |                     |
| addedAt   | DateTime | default now()       |
| userId    | Int (FK) | references User.id  |
| **Unique constraint**: (userId, bookId) |

### ChatRoom
| Field       | Type     | Notes               |
|-------------|----------|---------------------|
| id          | Int (PK) | autoincrement       |
| name        | String   |                     |
| slug        | String   | unique              |
| description | String?  |                     |
| emoji       | String?  |                     |
| createdAt   | DateTime | default now()       |

### Message
| Field     | Type     | Notes                  |
|-----------|----------|------------------------|
| id        | Int (PK) | autoincrement          |
| content   | String   | max 1000 chars (FE)    |
| createdAt | DateTime | default now()          |
| userId    | Int (FK) | references User.id     |
| roomId    | Int (FK) | references ChatRoom.id |

## Known Schema Issues

1. **`bio` field missing from User model.** The `PUT /api/profile` route calls
   `prisma.user.update({ data: { bio } })` but `bio` is not defined in the schema.
   This either silently fails or crashes at runtime.

2. **No genre tracking on BookLog.** Genre distribution on the Reading DNA page
   is mocked with deterministic pseudo-random values based on userId + log count.

3. **No friends junction table or relation in schema.** The `friends.js` route
   queries `user.friends` via Prisma, which implies a self-referential many-to-many
   relation should exist, but it's **not defined in the schema**. This likely causes
   a runtime error when fetching friends.

4. **Integers for IDs** rather than UUIDs. Fine for prototyping but limits
   horizontal scaling.

## Connection

- Adapter: `@prisma/adapter-pg` + `pg` (Pool)
- Connection string from `DATABASE_URL` env var
- Prisma Client is instantiated once in `server/index.js` and exported as a singleton
