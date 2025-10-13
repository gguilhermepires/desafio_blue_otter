# Database Schema

Complete reference for the PostgreSQL database schema used by the GitHub Repository Management API.

## Overview

The application uses **PostgreSQL 16** with **Prisma ORM** for type-safe database access and migrations.

**Database Name:** `github_repos`

**Schema:** `public` (default)

## Schema Overview

```
┌─────────────┐
│ Repository  │  Main table for GitHub repositories
├─────────────┤
│ id          │
│ githubId    │
│ name        │
│ owner       │
│ ...         │
└─────────────┘

┌─────────────┐
│ Log         │  Application logs
├─────────────┤
│ id          │
│ level       │
│ message     │
│ ...         │
└─────────────┘
```

## Tables

### Repository

Stores synchronized GitHub repository data.

**Prisma Model:**
```prisma
model Repository {
  id               Int       @id @default(autoincrement())
  githubId         Int       @unique
  name             String
  fullName         String
  owner            String
  description      String?
  url              String
  language         String?
  stargazersCount  Int
  forksCount       Int
  openIssuesCount  Int
  watchersCount    Int
  createdAt        DateTime
  updatedAt        DateTime
  pushedAt         DateTime?
  size             Int
  hasIssues        Boolean
  hasProjects      Boolean
  hasDownloads     Boolean
  hasWiki          Boolean
  hasPages         Boolean
  archived         Boolean
  disabled         Boolean
  visibility       String
  defaultBranch    String
  syncedAt         DateTime  @default(now())

  @@index([owner])
  @@index([language])
  @@index([createdAt])
}
```

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key (auto-increment) |
| githubId | INTEGER | No | GitHub repository ID (unique) |
| name | VARCHAR | No | Repository name |
| fullName | VARCHAR | No | Full name (owner/repo) |
| owner | VARCHAR | No | GitHub username |
| description | TEXT | Yes | Repository description |
| url | VARCHAR | No | GitHub repository URL |
| language | VARCHAR | Yes | Primary programming language |
| stargazersCount | INTEGER | No | Number of stars |
| forksCount | INTEGER | No | Number of forks |
| openIssuesCount | INTEGER | No | Number of open issues |
| watchersCount | INTEGER | No | Number of watchers |
| createdAt | TIMESTAMP | No | GitHub creation timestamp |
| updatedAt | TIMESTAMP | No | GitHub last update timestamp |
| pushedAt | TIMESTAMP | Yes | GitHub last push timestamp |
| size | INTEGER | No | Repository size in KB |
| hasIssues | BOOLEAN | No | Issues enabled |
| hasProjects | BOOLEAN | No | Projects enabled |
| hasDownloads | BOOLEAN | No | Downloads enabled |
| hasWiki | BOOLEAN | No | Wiki enabled |
| hasPages | BOOLEAN | No | GitHub Pages enabled |
| archived | BOOLEAN | No | Is archived |
| disabled | BOOLEAN | No | Is disabled |
| visibility | VARCHAR | No | public/private |
| defaultBranch | VARCHAR | No | Default branch name |
| syncedAt | TIMESTAMP | No | Last sync timestamp |

**Indexes:**
- `Repository_githubId_key` UNIQUE on `githubId`
- `Repository_owner_idx` on `owner` (for user queries)
- `Repository_language_idx` on `language` (for stats)
- `Repository_createdAt_idx` on `createdAt` (for timeline)

**Constraints:**
- Primary Key: `id`
- Unique: `githubId`

---

### Log

Stores application logs for monitoring and debugging.

**Prisma Model:**
```prisma
model Log {
  id            Int      @id @default(autoincrement())
  level         String
  message       String
  context       String?
  metadata      Json?
  correlationId String?
  timestamp     DateTime @default(now())

  @@index([correlationId])
  @@index([timestamp])
}
```

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key (auto-increment) |
| level | VARCHAR | No | Log level (error/warn/info/debug) |
| message | TEXT | No | Log message |
| context | VARCHAR | Yes | Context/module name |
| metadata | JSONB | Yes | Additional structured data |
| correlationId | VARCHAR | Yes | Request correlation ID |
| timestamp | TIMESTAMP | No | Log timestamp |

**Indexes:**
- `Log_correlationId_idx` on `correlationId` (for tracing)
- `Log_timestamp_idx` on `timestamp` (for time-based queries)

**Constraints:**
- Primary Key: `id`

## Relationships

Currently, the schema has no foreign key relationships:
- Repository table is independent
- Log table is independent

**Future Enhancements:**
- User table for authentication
- Sync history table for tracking sync operations
- Repository topics/tags table (many-to-many)

## Queries

### Common Queries

**Find repositories by owner:**
```sql
SELECT * FROM "Repository"
WHERE owner = 'octocat'
ORDER BY "stargazersCount" DESC
LIMIT 10;
```

**Search repositories:**
```sql
SELECT * FROM "Repository"
WHERE name ILIKE '%typescript%'
   OR description ILIKE '%typescript%'
   OR language ILIKE '%typescript%'
ORDER BY "stargazersCount" DESC;
```

**Language statistics:**
```sql
SELECT
  language,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "Repository"
GROUP BY language
ORDER BY count DESC;
```

**Top users by stars:**
```sql
SELECT
  owner,
  COUNT(*) as repository_count,
  SUM("stargazersCount") as total_stars,
  SUM("forksCount") as total_forks
FROM "Repository"
GROUP BY owner
ORDER BY total_stars DESC
LIMIT 10;
```

**Repositories over time:**
```sql
SELECT
  DATE_TRUNC('month', "createdAt") as month,
  COUNT(*) as count
FROM "Repository"
GROUP BY month
ORDER BY month ASC;
```

**Find logs by correlation ID:**
```sql
SELECT * FROM "Log"
WHERE "correlationId" = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY timestamp DESC;
```

**Clean old logs:**
```sql
DELETE FROM "Log"
WHERE timestamp < NOW() - INTERVAL '30 days';
```

## Migrations

### Migration Management

**Create migration:**
```bash
npx prisma migrate dev --name migration_name
```

**Apply migrations:**
```bash
npx prisma migrate deploy
```

**Reset database:**
```bash
npx prisma migrate reset
```

**Migration status:**
```bash
npx prisma migrate status
```

### Migration History

Migrations are stored in `prisma/migrations/`:

```
prisma/migrations/
├── 20250101000000_init/
│   └── migration.sql
├── 20250102000000_add_indexes/
│   └── migration.sql
└── migration_lock.toml
```

### Initial Migration

The initial migration creates both tables:

```sql
-- CreateTable
CREATE TABLE "Repository" (
    "id" SERIAL PRIMARY KEY,
    "githubId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    -- ... other columns
);

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");
CREATE INDEX "Repository_owner_idx" ON "Repository"("owner");
CREATE INDEX "Repository_language_idx" ON "Repository"("language");
CREATE INDEX "Repository_createdAt_idx" ON "Repository"("createdAt");

-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL PRIMARY KEY,
    "level" TEXT NOT NULL,
    -- ... other columns
);

-- CreateIndex
CREATE INDEX "Log_correlationId_idx" ON "Log"("correlationId");
CREATE INDEX "Log_timestamp_idx" ON "Log"("timestamp");
```

## Prisma Client

### Configuration

**schema.prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### Usage Examples

**Find unique:**
```typescript
const repo = await prisma.repository.findUnique({
  where: { githubId: 1296269 }
});
```

**Find many with pagination:**
```typescript
const repos = await prisma.repository.findMany({
  where: { owner: 'octocat' },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { stargazersCount: 'desc' }
});
```

**Upsert (insert or update):**
```typescript
await prisma.repository.upsert({
  where: { githubId: repo.id },
  create: { ...repoData },
  update: { ...repoData }
});
```

**Aggregation:**
```typescript
const stats = await prisma.repository.aggregate({
  _count: true,
  _sum: { stargazersCount: true, forksCount: true },
  _avg: { stargazersCount: true }
});
```

**Group by:**
```typescript
const languageStats = await prisma.repository.groupBy({
  by: ['language'],
  _count: true,
  orderBy: { _count: { language: 'desc' } }
});
```

## Performance Optimization

### Indexes

Current indexes optimize these queries:
- Finding repositories by owner (`owner` index)
- Grouping by language (`language` index)
- Timeline queries (`createdAt` index)
- Log tracing (`correlationId` index)
- Log cleanup (`timestamp` index)

### Connection Pooling

Prisma handles connection pooling automatically:

**Default settings:**
- Connection limit: Based on database server
- Connection timeout: 2 seconds
- Pool timeout: 10 seconds

**Custom configuration:**
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"
```

### Query Optimization

**Use select for large datasets:**
```typescript
const repos = await prisma.repository.findMany({
  select: { id: true, name: true, stargazersCount: true }
});
```

**Use cursor-based pagination for large datasets:**
```typescript
const repos = await prisma.repository.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastId },
  orderBy: { id: 'asc' }
});
```

## Backup and Restore

### Backup

**Full backup:**
```bash
pg_dump -h localhost -U postgres github_repos > backup.sql
```

**Schema only:**
```bash
pg_dump -h localhost -U postgres --schema-only github_repos > schema.sql
```

**Data only:**
```bash
pg_dump -h localhost -U postgres --data-only github_repos > data.sql
```

**With Docker:**
```bash
docker-compose exec postgres pg_dump -U postgres github_repos > backup.sql
```

### Restore

**Full restore:**
```bash
psql -h localhost -U postgres github_repos < backup.sql
```

**With Docker:**
```bash
docker-compose exec -T postgres psql -U postgres github_repos < backup.sql
```

## Maintenance

### Analyze Tables

```sql
ANALYZE "Repository";
ANALYZE "Log";
```

### Vacuum

```sql
VACUUM ANALYZE "Repository";
VACUUM ANALYZE "Log";
```

### Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Troubleshooting

### Connection Issues

```sql
-- Check active connections
SELECT * FROM pg_stat_activity
WHERE datname = 'github_repos';

-- Kill connection
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'github_repos' AND pid <> pg_backend_pid();
```

### Lock Issues

```sql
-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Check blocking queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocking_locks.pid AS blocking_pid,
  blocked_activity.usename AS blocked_user,
  blocking_activity.usename AS blocking_user
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
WHERE NOT blocked_locks.granted;
```

## Next Steps

- [Architecture Overview](/architecture)
- [Development Guide](/development)
- [API Reference](/api/)
