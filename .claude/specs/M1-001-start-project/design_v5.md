# Design Document: GitHub Repository Management API

## Overview

### Goals

This design document outlines the architecture and implementation approach for a RESTful API that synchronizes, stores, searches, and analyzes GitHub repository data. The system serves as an intermediary layer between GitHub's public API and client applications, providing enhanced search capabilities, analytical features, and persistent data storage.

### Scope

The system encompasses:

- **Four core API endpoints**: Repository synchronization, listing, search, and statistics
- **Data persistence layer**: PostgreSQL database with Prisma ORM for type-safe data access
- **External integration**: GitHub REST API v3 for fetching user and repository data
- **Containerized deployment**: Docker and Docker Compose for consistent environment setup
- **Comprehensive documentation**: Swagger/OpenAPI, README, and VitePress documentation site
- **Security and monitoring**: Rate limiting, CORS configuration, input validation, and database-backed logging with 30-day retention
- **Quality assurance**: 70% test coverage with unit and integration tests

### Key Design Principles

1. **Layered Architecture**: Clear separation between controllers, services, and repositories
2. **Type Safety**: TypeScript throughout with Prisma for database type safety
3. **Dependency Injection**: NestJS's built-in DI container for testability and maintainability
4. **API-First Design**: OpenAPI/Swagger documentation as the single source of truth for API contracts
5. **Async Operations**: Non-blocking database logging and efficient GitHub API integration
6. **Fail-Safe Design**: Graceful error handling, input validation, and external API resilience

## Architecture Design

### System Architecture Diagram

```mermaid
graph TB
    Client[Client Application] --> RateLimit[Rate Limiter]
    RateLimit --> CORS[CORS Handler]
    CORS --> Validation[Input Validation]
    Validation --> Router[NestJS Router]

    Router --> SyncController[Sync Controller]
    Router --> ListController[List Controller]
    Router --> SearchController[Search Controller]
    Router --> StatsController[Stats Controller]

    SyncController --> SyncService[Sync Service]
    ListController --> RepoService[Repository Service]
    SearchController --> SearchService[Search Service]
    StatsController --> StatsService[Statistics Service]

    SyncService --> GitHubClient[GitHub Client Service]
    SyncService --> RepoRepo[Repository Repository]
    SyncService --> UserRepo[User Repository]

    RepoService --> RepoRepo
    SearchService --> RepoRepo
    StatsService --> RepoRepo
    StatsService --> UserRepo

    RepoRepo --> Prisma[Prisma ORM]
    UserRepo --> Prisma

    Prisma --> PostgreSQL[(PostgreSQL Database)]

    GitHubClient --> GitHubAPI[GitHub REST API]

    SyncService --> Logger[Logging Service]
    RepoService --> Logger
    SearchService --> Logger
    StatsService --> Logger

    Logger --> LogQueue[Log Queue]
    LogQueue --> LogRepo[Log Repository]
    LogRepo --> Prisma
```

### Data Flow Diagram

```mermaid
graph LR
    A[Client Request] --> B{Endpoint Type}

    B -->|Sync| C[Validate Username]
    B -->|List| D[Validate Pagination]
    B -->|Search| E[Validate Keywords]
    B -->|Stats| F[Validate Parameters]

    C --> G[Fetch from GitHub API]
    G --> H[Transform Data]
    H --> I[Upsert to Database]
    I --> J[Return Sync Result]

    D --> K[Query Database]
    K --> L[Paginate Results]
    L --> M[Return Repository List]

    E --> N[Build Search Query]
    N --> O[Execute Search]
    O --> P[Rank Results]
    P --> Q[Paginate and Return]

    F --> R{User-specific?}
    R -->|Yes| S[Filter by User]
    R -->|No| T[Global Statistics]
    S --> U[Calculate Metrics]
    T --> U
    U --> V[Return Statistics]

    J --> W[Log to Database]
    M --> W
    Q --> W
    V --> W
```

## Component Design

### 1. Controllers Layer

#### SyncController
**Responsibilities:**
- Handle POST `/api/sync/:username` endpoint
- Validate GitHub username parameter
- Delegate synchronization to SyncService
- Return synchronization results with status codes

**Interfaces:**
```typescript
@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post(':username')
  @ApiOperation({ summary: 'Synchronize GitHub repositories for a user' })
  @ApiParam({ name: 'username', description: 'GitHub username' })
  @ApiResponse({ status: 200, type: SyncResultDto })
  @ApiResponse({ status: 404, description: 'User not found on GitHub' })
  @ApiResponse({ status: 429, description: 'GitHub rate limit exceeded' })
  @ApiResponse({ status: 502, description: 'GitHub API error' })
  async syncRepositories(
    @Param('username') username: string
  ): Promise<SyncResultDto>;
}
```

**Dependencies:**
- SyncService
- Logger

#### RepositoryController
**Responsibilities:**
- Handle GET `/api/repositories/:username` endpoint
- Validate username and pagination parameters
- Delegate listing to RepositoryService
- Return paginated repository list

**Interfaces:**
```typescript
@Controller('api/repositories')
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Get(':username')
  @ApiOperation({ summary: 'List repositories for a user' })
  @ApiParam({ name: 'username', description: 'GitHub username' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedRepositoryDto })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async listRepositories(
    @Param('username') username: string,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedRepositoryDto>;
}
```

**Dependencies:**
- RepositoryService
- Logger

#### SearchController
**Responsibilities:**
- Handle GET `/api/search` endpoint
- Validate search keywords and pagination parameters
- Delegate search to SearchService
- Return ranked, paginated search results

**Interfaces:**
```typescript
@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search repositories by keywords' })
  @ApiQuery({ name: 'keywords', description: 'Search keywords', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedRepositoryDto })
  @ApiResponse({ status: 400, description: 'Missing or invalid keywords' })
  async searchRepositories(
    @Query() searchDto: SearchDto
  ): Promise<PaginatedRepositoryDto>;
}
```

**Dependencies:**
- SearchService
- Logger

#### StatisticsController
**Responsibilities:**
- Handle GET `/api/statistics` endpoint
- Validate optional user and topN parameters
- Delegate statistics calculation to StatisticsService
- Return computed statistics

**Interfaces:**
```typescript
@Controller('api/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get repository statistics' })
  @ApiQuery({ name: 'user', required: false, description: 'Username for user-specific stats' })
  @ApiQuery({ name: 'topN', required: false, type: Number, description: 'Top N users (1-20, default: 5)' })
  @ApiResponse({ status: 200, type: StatisticsDto })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getStatistics(
    @Query() statsQueryDto: StatsQueryDto
  ): Promise<StatisticsDto>;
}
```

**Dependencies:**
- StatisticsService
- Logger

### 2. Services Layer

#### SyncService
**Responsibilities:**
- Orchestrate synchronization workflow
- Call GitHubClientService to fetch user and repository data
- Transform GitHub API responses to domain models
- Coordinate with repositories to upsert data
- Handle GitHub API errors and rate limiting
- Prevent concurrent synchronization of same user

**Interfaces:**
```typescript
@Injectable()
export class SyncService {
  constructor(
    private readonly githubClient: GitHubClientService,
    private readonly repositoryRepository: RepositoryRepository,
    private readonly userRepository: UserRepository,
    private readonly logger: LoggingService
  ) {}

  async syncUserRepositories(username: string): Promise<SyncResult>;
  private async fetchGitHubUser(username: string): Promise<GitHubUser>;
  private async fetchGitHubRepositories(username: string): Promise<GitHubRepository[]>;
  private transformGitHubUser(githubUser: GitHubUser): UserEntity;
  private transformGitHubRepository(githubRepo: GitHubRepository): RepositoryEntity;
  private async upsertUser(user: UserEntity): Promise<void>;
  private async upsertRepositories(repositories: RepositoryEntity[]): Promise<void>;
}
```

**Dependencies:**
- GitHubClientService
- RepositoryRepository
- UserRepository
- LoggingService

#### RepositoryService
**Responsibilities:**
- Retrieve repositories for a specific user
- Apply pagination logic
- Order results by creation date descending
- Return metadata for pagination

**Interfaces:**
```typescript
@Injectable()
export class RepositoryService {
  constructor(
    private readonly repositoryRepository: RepositoryRepository,
    private readonly logger: LoggingService
  ) {}

  async listRepositoriesByUser(
    username: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Repository>>;
}
```

**Dependencies:**
- RepositoryRepository
- LoggingService

#### SearchService
**Responsibilities:**
- Parse and sanitize search keywords
- Build database search queries with OR logic
- Implement relevance ranking (exact matches first, then partial)
- Apply pagination
- Complete searches within 3 seconds for 10,000 repositories

**Interfaces:**
```typescript
@Injectable()
export class SearchService {
  constructor(
    private readonly repositoryRepository: RepositoryRepository,
    private readonly logger: LoggingService
  ) {}

  async searchRepositories(
    keywords: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Repository>>;
  private sanitizeKeywords(keywords: string): string[];
  private buildSearchQuery(keywords: string[]): SearchQuery;
  private rankResults(results: Repository[]): Repository[];
}
```

**Dependencies:**
- RepositoryRepository
- LoggingService

#### StatisticsService
**Responsibilities:**
- Calculate global or user-specific statistics
- Aggregate language distribution
- Generate top users ranking
- Create monthly timeline histogram
- Handle null language values
- Cap topN parameter at 20

**Interfaces:**
```typescript
@Injectable()
export class StatisticsService {
  constructor(
    private readonly repositoryRepository: RepositoryRepository,
    private readonly userRepository: UserRepository,
    private readonly logger: LoggingService
  ) {}

  async getStatistics(
    username?: string,
    topN: number = 5
  ): Promise<Statistics>;
  private async calculateSummary(username?: string): Promise<StatsSummary>;
  private async calculateLanguageDistribution(username?: string): Promise<LanguageStats>;
  private async calculateTopUsers(topN: number): Promise<UserRanking[]>;
  private async calculateMonthlyTimeline(username?: string): Promise<MonthlyTimeline>;
  private fillMissingMonths(timeline: MonthlyTimeline): MonthlyTimeline;
}
```

**Dependencies:**
- RepositoryRepository
- UserRepository
- LoggingService

#### GitHubClientService
**Responsibilities:**
- Make HTTP requests to GitHub REST API
- Handle authentication if GitHub token provided
- Implement timeout mechanisms
- Parse GitHub API responses
- Handle rate limiting with exponential backoff
- Map HTTP errors to domain exceptions

**Interfaces:**
```typescript
@Injectable()
export class GitHubClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: LoggingService
  ) {}

  async getUser(username: string): Promise<GitHubUser>;
  async getUserRepositories(username: string): Promise<GitHubRepository[]>;
  private buildHeaders(): Record<string, string>;
  private handleRateLimit(response: AxiosResponse): void;
  private retryWithBackoff<T>(fn: () => Promise<T>, retries: number): Promise<T>;
}
```

**Dependencies:**
- HttpService (from @nestjs/axios)
- ConfigService
- LoggingService

#### LoggingService
**Responsibilities:**
- Provide logging methods for different levels (debug, info, warn, error)
- Format logs as structured JSON
- Queue logs for asynchronous database writes
- Flush log queue to database periodically
- Include contextual information (endpoint, method, request ID)
- Prevent blocking API request processing

**Interfaces:**
```typescript
@Injectable()
export class LoggingService {
  constructor(
    private readonly logRepository: LogRepository,
    private readonly configService: ConfigService
  ) {}

  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  private queueLog(level: LogLevel, message: string, context?: Record<string, any>, stackTrace?: string): void;
  private async flushLogs(): Promise<void>;
}
```

**Dependencies:**
- LogRepository
- ConfigService

### 3. Repository Layer

#### RepositoryRepository
**Responsibilities:**
- Encapsulate all database operations for repositories
- Provide CRUD operations
- Implement search queries with relevance ranking
- Handle pagination and sorting
- Use Prisma for type-safe queries
- Implement efficient batch upserts

**Interfaces:**
```typescript
@Injectable()
export class RepositoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(repository: RepositoryEntity): Promise<Repository>;
  async upsertMany(repositories: RepositoryEntity[]): Promise<number>;
  async findByUsername(username: string, pagination: PaginationParams): Promise<PaginatedResult<Repository>>;
  async search(keywords: string[], pagination: PaginationParams): Promise<PaginatedResult<Repository>>;
  async countByUsername(username: string): Promise<number>;
  async countAll(): Promise<number>;
  async getLanguageDistribution(username?: string): Promise<LanguageStats>;
  async getMonthlyTimeline(username?: string): Promise<MonthlyTimeline>;
}
```

**Dependencies:**
- PrismaService

#### UserRepository
**Responsibilities:**
- Encapsulate database operations for users
- Provide upsert operation for user data
- Retrieve user statistics and rankings
- Use Prisma for type-safe queries

**Interfaces:**
```typescript
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: UserEntity): Promise<User>;
  async findByUsername(username: string): Promise<User | null>;
  async countAll(): Promise<number>;
  async getTopUsersByRepoCount(topN: number): Promise<UserRanking[]>;
}
```

**Dependencies:**
- PrismaService

#### LogRepository
**Responsibilities:**
- Persist log entries to database
- Batch insert logs for efficiency
- Implement 30-day retention cleanup
- Query logs for monitoring/debugging

**Interfaces:**
```typescript
@Injectable()
export class LogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(logs: LogEntity[]): Promise<number>;
  async deleteOlderThan(days: number): Promise<number>;
  async findRecent(limit: number): Promise<Log[]>;
}
```

**Dependencies:**
- PrismaService

## Data Model

### Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int          @id @default(autoincrement())
  githubId     Int          @unique @map("github_id")
  login        String       @unique
  avatarUrl    String       @map("avatar_url")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")
  repositories Repository[]

  @@index([login])
  @@map("users")
}

model Repository {
  id           Int       @id @default(autoincrement())
  githubId     Int       @unique @map("github_id")
  name         String
  description  String?
  url          String
  language     String?
  createdAt    DateTime  @map("created_at")
  syncedAt     DateTime  @default(now()) @map("synced_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  userId       Int       @map("user_id")
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([name])
  @@index([language])
  @@index([createdAt])
  @@index([userId, createdAt])
  @@map("repositories")
}

model Log {
  id         Int      @id @default(autoincrement())
  level      LogLevel
  message    String
  context    Json?
  stackTrace String?  @map("stack_trace")
  timestamp  DateTime @default(now())

  @@index([timestamp])
  @@index([level])
  @@map("logs")
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}
```

### Data Model Diagram

```mermaid
erDiagram
    USER ||--o{ REPOSITORY : owns
    USER {
        int id PK
        int githubId UK
        string login UK
        string avatarUrl
        datetime createdAt
        datetime updatedAt
    }
    REPOSITORY {
        int id PK
        int githubId UK
        string name
        string description
        string url
        string language
        datetime createdAt
        datetime syncedAt
        datetime updatedAt
        int userId FK
    }
    LOG {
        int id PK
        enum level
        string message
        json context
        string stackTrace
        datetime timestamp
    }
```

### Core Entities and DTOs

#### Repository Entity
```typescript
export interface Repository {
  id: number;
  githubId: number;
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  createdAt: Date;
  syncedAt: Date;
  updatedAt: Date;
  userId: number;
}
```

#### User Entity
```typescript
export interface User {
  id: number;
  githubId: number;
  login: string;
  avatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### SyncResultDto
```typescript
export class SyncResultDto {
  @ApiProperty({ description: 'Number of repositories synchronized' })
  repositoriesSynced: number;

  @ApiProperty({ description: 'Timestamp of synchronization operation' })
  timestamp: Date;

  @ApiProperty({ description: 'GitHub username' })
  username: string;
}
```

#### PaginatedRepositoryDto
```typescript
export class PaginatedRepositoryDto {
  @ApiProperty({ type: [RepositoryDto] })
  data: RepositoryDto[];

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  pageSize: number;

  @ApiProperty({ description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
```

#### StatisticsDto
```typescript
export class StatisticsDto {
  @ApiProperty({ type: StatsSummaryDto })
  summary: StatsSummaryDto;

  @ApiProperty({ type: Object, description: 'Language distribution with counts' })
  languages: Record<string, number>;

  @ApiProperty({ type: [UserRankingDto], required: false })
  topUsersByRepos?: UserRankingDto[];

  @ApiProperty({ type: Object, description: 'Monthly timeline in YYYY-MM format' })
  timelineCreatedMonthly: Record<string, number>;
}
```

## Business Process

### Process 1: Repository Synchronization Flow

```mermaid
flowchart TD
    A[Client calls POST /api/sync/:username] --> B[SyncController.syncRepositories]
    B --> C[Validate username parameter]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[SyncService.syncUserRepositories]

    F --> G[Check for concurrent sync of same user]
    G --> H{Already syncing?}
    H -->|Yes| I[Return 409 Conflict]
    H -->|No| J[Acquire sync lock for user]

    J --> K[GitHubClientService.getUser]
    K --> L{User found?}
    L -->|No| M[Return 404 Not Found]
    L -->|Yes| N[Transform to UserEntity]

    N --> O[UserRepository.upsert]
    O --> P[GitHubClientService.getUserRepositories]

    P --> Q{Rate limit exceeded?}
    Q -->|Yes| R[Return 429 Too Many Requests]
    Q -->|No| S[Transform to RepositoryEntity array]

    S --> T[Begin database transaction]
    T --> U[RepositoryRepository.upsertMany]
    U --> V[Commit transaction]
    V --> W[Release sync lock]
    W --> X[Logger.info - Log sync success]
    X --> Y[Return SyncResultDto with count and timestamp]

    M --> Z[Logger.error - Log GitHub user not found]
    R --> AA[Logger.warn - Log rate limit]
    E --> AB[Logger.warn - Log validation error]
```

### Process 2: Repository Listing Flow

```mermaid
flowchart TD
    A[Client calls GET /api/repositories/:username] --> B[RepositoryController.listRepositories]
    B --> C[Validate username and pagination params]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[RepositoryService.listRepositoriesByUser]

    F --> G[RepositoryRepository.findByUsername]
    G --> H[Build Prisma query with filters]
    H --> I[Apply ordering by createdAt DESC]
    I --> J[Calculate pagination offset]
    J --> K[Execute paginated query]

    K --> L[RepositoryRepository.countByUsername]
    L --> M[Calculate total pages]
    M --> N[Build PaginatedRepositoryDto]
    N --> O[Logger.info - Log successful listing]
    O --> P[Return 200 with paginated results]

    E --> Q[Logger.warn - Log validation error]
```

### Process 3: Repository Search Flow

```mermaid
flowchart TD
    A[Client calls GET /api/search?keywords=value] --> B[SearchController.searchRepositories]
    B --> C[Validate keywords and pagination params]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[SearchService.searchRepositories]

    F --> G[SearchService.sanitizeKeywords]
    G --> H[Split keywords by spaces]
    H --> I[Escape special SQL characters]
    I --> J[SearchService.buildSearchQuery]

    J --> K[Build OR query for name, description, language]
    K --> L[RepositoryRepository.search]
    L --> M[Execute Prisma search with icontains]

    M --> N[SearchService.rankResults]
    N --> O[Exact matches first]
    O --> P[Partial matches second]
    P --> Q[Order by createdAt DESC within groups]

    Q --> R[Apply pagination]
    R --> S[Build PaginatedRepositoryDto]
    S --> T[Logger.info - Log search execution]
    T --> U[Return 200 with ranked results]

    E --> V[Logger.warn - Log validation error]
```

### Process 4: Statistics Generation Flow

```mermaid
flowchart TD
    A[Client calls GET /api/statistics] --> B[StatisticsController.getStatistics]
    B --> C[Validate optional user and topN params]
    C --> D{Valid topN?}
    D -->|< 1| E[Return 400 Bad Request]
    D -->|> 20| F[Cap at 20]
    D -->|Valid| G[StatisticsService.getStatistics]
    F --> G

    G --> H{User-specific?}
    H -->|Yes| I[Filter all queries by username]
    H -->|No| J[Global statistics]

    I --> K[StatisticsService.calculateSummary]
    J --> K
    K --> L[RepositoryRepository.countByUsername or countAll]
    L --> M{Global?}
    M -->|Yes| N[UserRepository.countAll]
    M -->|No| O[Skip user count]

    N --> P[StatisticsService.calculateLanguageDistribution]
    O --> P
    P --> Q[RepositoryRepository.getLanguageDistribution]
    Q --> R[Group by language, count repositories]
    R --> S[Order by count DESC]

    S --> T{Global?}
    T -->|Yes| U[StatisticsService.calculateTopUsers]
    U --> V[UserRepository.getTopUsersByRepoCount]
    V --> W[Order by repo count DESC, limit by topN]
    T -->|No| X[Skip top users]

    W --> Y[StatisticsService.calculateMonthlyTimeline]
    X --> Y
    Y --> Z[RepositoryRepository.getMonthlyTimeline]
    Z --> AA[Group by year and month, count repos]
    AA --> AB[StatisticsService.fillMissingMonths]
    AB --> AC[Fill gaps with zero counts]

    AC --> AD[Build StatisticsDto]
    AD --> AE[Logger.info - Log stats calculation]
    AE --> AF[Return 200 with statistics]

    E --> AG[Logger.warn - Log validation error]
```

### Process 5: Asynchronous Logging and Retention Flow

```mermaid
flowchart TD
    A[Application generates log] --> B[LoggingService.info/warn/error]
    B --> C[Format log as JSON]
    C --> D[Add context: endpoint, method, requestId]
    D --> E[Add timestamp and level]
    E --> F[Push to in-memory log queue]

    F --> G{Queue size threshold?}
    G -->|< 100| H[Continue processing]
    G -->|>= 100| I[Trigger flush]

    I --> J[LoggingService.flushLogs]
    J --> K[Batch logs from queue]
    K --> L[LogRepository.createMany]
    L --> M[Prisma bulk insert to logs table]
    M --> N[Clear flushed logs from queue]

    H --> O[Scheduled task runs every 10 seconds]
    O --> P[Check if queue has logs]
    P --> Q{Has logs?}
    Q -->|Yes| I
    Q -->|No| R[Wait for next interval]

    N --> S[Daily retention cleanup task]
    S --> T[LogRepository.deleteOlderThan]
    T --> U[Calculate retention date: now - 30 days]
    U --> V[Prisma delete where timestamp < retentionDate]
    V --> W[Log cleanup summary]
```

## Error Handling Strategy

### Error Classification

1. **Validation Errors (4xx)**
   - **400 Bad Request**: Invalid input parameters, missing required fields
   - **404 Not Found**: GitHub user not found
   - **409 Conflict**: Concurrent synchronization attempt
   - **429 Too Many Requests**: Rate limit exceeded (GitHub or internal)

2. **Server Errors (5xx)**
   - **500 Internal Server Error**: Unexpected application errors
   - **502 Bad Gateway**: GitHub API errors or timeouts
   - **503 Service Unavailable**: Database connection failures

### Error Response Format

All errors return consistent JSON structure:

```typescript
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: Record<string, any>;
}
```

### Exception Handling Approach

1. **Global Exception Filter**
   - Catch all unhandled exceptions
   - Log with full stack trace
   - Return sanitized error response
   - Map domain exceptions to HTTP status codes

2. **Domain-Specific Exceptions**
   ```typescript
   export class GitHubUserNotFoundException extends NotFoundException {
     constructor(username: string) {
       super(`GitHub user '${username}' not found`);
     }
   }

   export class GitHubRateLimitException extends HttpException {
     constructor(resetAt: Date) {
       super(
         {
           message: 'GitHub API rate limit exceeded',
           resetAt: resetAt.toISOString()
         },
         429
       );
     }
   }

   export class ConcurrentSyncException extends ConflictException {
     constructor(username: string) {
       super(`Synchronization already in progress for user '${username}'`);
     }
   }
   ```

3. **Input Validation**
   - Use class-validator decorators in DTOs
   - Automatic validation via ValidationPipe
   - Return detailed validation error messages

4. **Database Error Handling**
   - Catch Prisma errors and map to domain exceptions
   - Unique constraint violations → 409 Conflict
   - Connection failures → 503 Service Unavailable
   - Transaction rollback on any error

5. **External API Error Handling**
   - Timeout after 10 seconds
   - Retry with exponential backoff (3 attempts)
   - Circuit breaker pattern for repeated failures
   - Graceful degradation when GitHub is unavailable

6. **Logging Strategy**
   - Log all errors with full context
   - Never expose sensitive data in responses
   - Include request ID for tracing
   - Separate error logs for monitoring/alerting

## Testing Strategy

### Test Coverage Requirements

- **Overall Coverage**: Minimum 70%
- **Service Layer**: Minimum 80% (core business logic)
- **Repository Layer**: Minimum 75%
- **Controller Layer**: Minimum 60% (integration tests)

### Unit Testing

#### Services
- **SyncService**
  - Test user synchronization workflow
  - Test repository upsert logic
  - Test error handling for GitHub API failures
  - Test concurrent sync prevention
  - Mock GitHubClientService, repositories, logger

- **RepositoryService**
  - Test pagination logic
  - Test ordering by creation date
  - Mock RepositoryRepository

- **SearchService**
  - Test keyword sanitization
  - Test search query building
  - Test relevance ranking algorithm
  - Mock RepositoryRepository

- **StatisticsService**
  - Test global statistics calculation
  - Test user-specific statistics
  - Test topN parameter validation and capping
  - Test monthly timeline generation with gaps
  - Mock repositories

- **GitHubClientService**
  - Test API request construction
  - Test response parsing
  - Test rate limit handling
  - Test retry logic with exponential backoff
  - Use nock or msw for HTTP mocking

#### Repositories
- Use in-memory SQLite or test database
- Test CRUD operations
- Test pagination and sorting
- Test search queries
- Test aggregations for statistics

### Integration Testing

#### API Endpoints
- **POST /api/sync/:username**
  - Test successful synchronization
  - Test GitHub user not found (404)
  - Test concurrent sync prevention (409)
  - Test rate limiting (429)
  - Mock GitHub API responses

- **GET /api/repositories/:username**
  - Test successful listing with pagination
  - Test empty results
  - Test invalid pagination parameters

- **GET /api/search**
  - Test keyword search with results
  - Test empty results
  - Test missing keywords parameter
  - Test pagination

- **GET /api/statistics**
  - Test global statistics
  - Test user-specific statistics
  - Test topN parameter validation
  - Test empty database

#### Database Integration
- Use Docker PostgreSQL test container
- Run migrations before tests
- Clean database after each test
- Test transaction rollbacks

### End-to-End Testing

- **Full Workflow Test**
  1. Sync a GitHub user
  2. List repositories
  3. Search repositories
  4. Generate statistics
  5. Verify data consistency

- **Error Scenario Tests**
  - Database unavailable
  - GitHub API timeout
  - Invalid input combinations

### Test Utilities

```typescript
// Test data builders
export class RepositoryBuilder {
  static build(overrides?: Partial<Repository>): Repository {
    return {
      id: 1,
      githubId: 12345,
      name: 'test-repo',
      description: 'Test repository',
      url: 'https://github.com/user/test-repo',
      language: 'TypeScript',
      createdAt: new Date(),
      syncedAt: new Date(),
      updatedAt: new Date(),
      userId: 1,
      ...overrides
    };
  }
}

// Mock factories
export const mockGitHubClientService = {
  getUser: jest.fn(),
  getUserRepositories: jest.fn()
};

// Test database setup
export async function setupTestDatabase(): Promise<PrismaClient> {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.TEST_DATABASE_URL } }
  });
  await prisma.$executeRawUnsafe('TRUNCATE TABLE repositories, users, logs CASCADE');
  return prisma;
}
```

### Continuous Integration

- Run tests on every commit
- Enforce coverage thresholds
- Fail build if tests fail or coverage drops
- Generate coverage reports
- Run linting and type checking

### Test Execution Commands

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:integration": "jest --testPathPattern=integration"
  }
}
```

## Security Considerations

### Rate Limiting

- **Implementation**: Use `@nestjs/throttler` package
- **Configuration**:
  ```typescript
  ThrottlerModule.forRoot({
    ttl: 60,      // Time window in seconds
    limit: 100,   // Max requests per ttl per IP
  })
  ```
- **Per-Endpoint Overrides**:
  - `/api/sync/:username`: 10 requests per minute
  - `/api/search`: 30 requests per minute
  - `/api/statistics`: 20 requests per minute

### CORS Configuration

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

### Input Validation and Sanitization

- **DTO Validation**: Use class-validator decorators
- **SQL Injection Prevention**: Prisma parameterized queries
- **XSS Prevention**: Sanitize user inputs, escape HTML in responses
- **Path Traversal**: Validate username parameters against allowed characters

### Secrets Management

- Store GitHub token in environment variables
- Never commit `.env` files
- Use Docker secrets for production
- Rotate tokens regularly

### HTTPS and Transport Security

- Enforce HTTPS in production
- Set secure headers using `helmet` middleware
- Configure HSTS (HTTP Strict Transport Security)

### Database Security

- Use connection pooling with max connection limits
- Apply principle of least privilege for database user
- Enable SSL for database connections in production
- Regular security patches and updates

## Deployment Architecture

### Docker Configuration

#### Dockerfile (Multi-stage build)

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: github-api-db
    environment:
      POSTGRES_DB: github_api
      POSTGRES_USER: api_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U api_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: github-api
    environment:
      DATABASE_URL: postgresql://api_user:${DB_PASSWORD}@postgres:5432/github_api
      NODE_ENV: production
      PORT: 3000
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      CORS_ORIGINS: ${CORS_ORIGINS}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      LOG_RETENTION_DAYS: ${LOG_RETENTION_DAYS:-30}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://api_user:password@localhost:5432/github_api
DB_PASSWORD=secure_password

# Application
NODE_ENV=development
PORT=3000

# GitHub API
GITHUB_TOKEN=ghp_your_token_here

# Security
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Health Checks

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly githubClient: GitHubClientService
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const dbHealthy = await this.checkDatabase();
    const githubHealthy = await this.checkGitHub();

    return {
      status: dbHealthy && githubHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        github: githubHealthy ? 'up' : 'down'
      }
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkGitHub(): Promise<boolean> {
    try {
      await this.githubClient.getUser('github');
      return true;
    } catch {
      return false;
    }
  }
}
```

## Documentation Strategy

### Swagger/OpenAPI

- **Setup**: Use `@nestjs/swagger` package
- **Location**: Accessible at `/api/docs`
- **Features**:
  - Interactive API testing
  - Request/response schemas
  - Authentication configuration
  - Example payloads

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('GitHub Repository Management API')
  .setDescription('RESTful API for synchronizing, searching, and analyzing GitHub repository data')
  .setVersion('1.0')
  .addTag('sync', 'Repository synchronization endpoints')
  .addTag('repositories', 'Repository listing endpoints')
  .addTag('search', 'Repository search endpoints')
  .addTag('statistics', 'Statistics and analytics endpoints')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### README.md Structure

1. Project Overview
2. Features
3. Technology Stack
4. Prerequisites
5. Installation and Setup
6. Running with Docker Compose
7. Environment Variables
8. API Endpoints Overview
9. Testing
10. Project Structure
11. Contributing
12. License

### VitePress Documentation

```
docs/
├── .vitepress/
│   └── config.ts
├── index.md                  # Home page
├── guide/
│   ├── getting-started.md    # Setup and installation
│   ├── api-reference.md      # Detailed API docs
│   └── deployment.md         # Deployment guide
├── architecture/
│   ├── overview.md           # System architecture
│   ├── database-schema.md    # Data model details
│   └── design-decisions.md   # ADRs
└── development/
    ├── setup.md              # Local development setup
    ├── testing.md            # Testing guide
    └── contributing.md       # Contribution guidelines
```

## Performance Optimization

### Database Optimization

1. **Indexing Strategy**
   - Primary indexes on `githubId` (unique constraints)
   - Composite index on `[userId, createdAt]` for listing
   - Index on `language` for statistics
   - Index on `name` for search
   - Index on `timestamp` for log queries

2. **Connection Pooling**
   ```typescript
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   // Connection pool configuration
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL
       }
     },
     // Connection pool: min 2, max 10
   });
   ```

3. **Query Optimization**
   - Use `select` to retrieve only needed fields
   - Batch upserts for repository synchronization
   - Avoid N+1 queries with Prisma's `include`

### Caching Strategy (Future Enhancement)

- Cache GitHub API responses for 5 minutes
- Cache statistics for 10 minutes
- Use Redis for distributed caching
- Invalidate cache on synchronization

### Async Processing

- Asynchronous log writes to database
- Queue-based logging with batch inserts
- Background job for log retention cleanup

## Scalability Considerations

### Horizontal Scaling

- Stateless API design
- Externalized configuration
- Shared PostgreSQL database
- Load balancer for multiple API instances

### Database Scaling

- Read replicas for statistics and search
- Partitioning logs table by date
- Archive old logs to cold storage

### Monitoring and Observability

- Prometheus metrics endpoint
- Structured JSON logging
- Request tracing with correlation IDs
- Performance monitoring with APM tools

---

**Document Version**: 5.0
**Last Updated**: 2025-10-11
**Author**: Claude Code (Spec Design Agent)
