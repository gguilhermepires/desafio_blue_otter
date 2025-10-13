# Architecture

This document provides an overview of the GitHub Repository Management API's system architecture and design decisions.

## System Overview

The application follows a **layered architecture** pattern using NestJS modules, providing clear separation of concerns and maintainability.

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│              (REST API Consumers)                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API Gateway Layer                      │
│        (NestJS Controllers + Middleware)                 │
│  - Rate Limiting  - CORS  - Helmet  - Validation        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
│              (Business Logic)                            │
│  - RepositoriesService  - StatisticsService              │
└─────────────────────────────────────────────────────────┘
                          │
                   ┌──────┴──────┐
                   ▼              ▼
         ┌──────────────┐ ┌──────────────┐
         │   Database   │ │ External API │
         │  (Prisma)    │ │  (GitHub)    │
         │  PostgreSQL  │ │              │
         └──────────────┘ └──────────────┘
```

## Technology Stack

### Backend Framework
- **NestJS** - Progressive Node.js framework with TypeScript
- **Node.js 18+** - JavaScript runtime

### Database
- **PostgreSQL 16** - Relational database
- **Prisma** - Type-safe ORM with migrations

### External Services
- **GitHub REST API v3** - Repository data source

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Module Structure

The application is organized into the following NestJS modules:

### Core Modules

#### App Module (`src/app.module.ts`)
Root module that imports and configures all feature modules.

#### Repositories Module (`src/modules/repositories/`)
Handles repository synchronization, listing, and search operations.

**Components:**
- `RepositoriesController` - HTTP endpoints
- `RepositoriesService` - Business logic
- `GithubService` - GitHub API integration
- DTOs for request/response validation

#### Statistics Module (`src/modules/statistics/`)
Provides analytics and insights from repository data.

**Components:**
- `StatisticsController` - HTTP endpoints
- `StatisticsService` - Statistical computations
- DTOs for response formatting

#### Logger Module (`src/modules/logger/`)
Custom logging with database persistence and correlation IDs.

**Features:**
- Async database logging
- Correlation ID tracking
- Structured JSON output
- 30-day retention policy

### Shared Components

#### Database Module (`src/modules/database/`)
Prisma client initialization and database connection management.

#### Common (`src/common/`)
Shared DTOs, decorators, and utilities used across modules.

## Data Flow

### Repository Sync Flow

```
1. Client Request
   POST /api/repositories/sync/octocat
        │
        ▼
2. RepositoriesController
   - Validates username
   - Calls service
        │
        ▼
3. RepositoriesService
   - Calls GithubService
        │
        ▼
4. GithubService
   - Fetches from GitHub API
   - Paginates results
        │
        ▼
5. RepositoriesService
   - Transforms data
   - Upserts to database
        │
        ▼
6. Response
   Returns count and metadata
```

### Search Flow

```
1. Client Request
   GET /api/repositories/search?q=typescript
        │
        ▼
2. RepositoriesController
   - Validates query params
   - Calls service
        │
        ▼
3. RepositoriesService
   - Executes full-text search
   - Applies pagination
        │
        ▼
4. Prisma
   - Queries PostgreSQL
   - Returns results
        │
        ▼
5. Response
   Returns paginated results
```

## Database Schema

### Repository Table

```sql
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

### Log Table

```sql
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

## Security Architecture

### Request Security
- **Helmet** - Sets security HTTP headers
- **CORS** - Configurable origin whitelist
- **Rate Limiting** - 100 requests/minute per IP
- **Input Validation** - Class-validator on all DTOs

### Data Security
- **SQL Injection Protection** - Prisma parameterized queries
- **XSS Protection** - Content Security Policy headers
- **HTTPS Ready** - TLS termination support

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design** - No session storage
- **Database Connection Pooling** - Prisma manages connections
- **Container Ready** - Easy to replicate with Docker

### Performance Optimization
- **Database Indexes** - On frequently queried fields
- **Pagination** - All list endpoints support pagination
- **Caching Strategy** - Local database reduces GitHub API calls

### Future Enhancements
- Redis caching for frequently accessed data
- Background job queue for async operations
- Read replicas for scaling database reads
- API response caching with ETags

## Monitoring and Observability

### Logging
- Structured JSON logs
- Correlation IDs for request tracing
- Database-persisted logs with 30-day retention
- Configurable log levels

### Health Checks
- PostgreSQL connection health check
- Docker Compose health monitoring

### Future Monitoring
- Prometheus metrics export
- Grafana dashboards
- APM integration (e.g., New Relic, DataDog)

## Deployment Architecture

### Development
```
Local Machine
├── Node.js (development mode)
└── PostgreSQL (Docker)
```

### Production
```
Docker Compose Stack
├── API Container (NestJS)
│   ├── Health checks
│   └── Auto-restart
└── Database Container (PostgreSQL)
    ├── Volume persistence
    └── Automated backups
```

## Design Patterns

### Repository Pattern
Prisma acts as the repository layer, abstracting database operations.

### Service Layer Pattern
Business logic separated from controllers for testability.

### Dependency Injection
NestJS DI container manages all dependencies.

### DTO Pattern
Data Transfer Objects for request/response validation and transformation.

## Error Handling Strategy

- **Global Exception Filter** - Catches all unhandled errors
- **HTTP Exception** - Standard NestJS exceptions
- **Validation Errors** - Automatic validation with class-validator
- **External API Errors** - Wrapped and logged with context

## Testing Strategy

See [Testing Guide](/testing) for detailed testing architecture.

## Next Steps

- [Database Schema Details](/database)
- [Security Guidelines](/security)
- [Development Guide](/development)
- [Deployment Instructions](/deployment)
