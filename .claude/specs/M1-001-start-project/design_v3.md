# Design Document: GitHub Repository Management API

## Overview

### Design Goal

The GitHub Repository Management API is a back-end system that synchronizes GitHub repository data into a local PostgreSQL database and provides enhanced search, filtering, and statistical analysis capabilities. The system acts as an intermediary layer between GitHub's public API and client applications, offering persistent storage, advanced query capabilities, and aggregated insights not directly available through GitHub's native API.

### Scope

This design covers the implementation of a RESTful API with four primary endpoints:

1. **Repository Synchronization** - Fetches and stores GitHub user and repository data
2. **Repository Listing** - Retrieves paginated lists of repositories for specific users
3. **Repository Search** - Provides advanced search capabilities across repository attributes
4. **Statistics Generation** - Calculates aggregated metrics and trends from stored data

The system will be built using NestJS with TypeScript, PostgreSQL with Prisma ORM, and containerized using Docker. It includes comprehensive logging, security features, API documentation, and extensive test coverage.

### Key Design Principles

- **Layered Architecture**: Clear separation between controllers, services, and data access layers
- **Type Safety**: Leveraging TypeScript and Prisma for compile-time type checking
- **Asynchronous Processing**: Non-blocking operations for external API calls and database writes
- **Scalability**: Support for concurrent requests, pagination, and connection pooling
- **Security**: Input validation, rate limiting, CORS configuration, and secure error handling
- **Observability**: Structured logging with database persistence and 30-day retention
- **Testability**: Modular design enabling unit and integration testing with 70% code coverage

## Architecture Design

### System Architecture Diagram

```mermaid
graph TB
    Client[API Client] --> CORS[CORS Middleware]
    CORS --> RateLimit[Rate Limiter Throttler]
    RateLimit --> Validation[Validation Pipe]
    Validation --> Router[NestJS Router]

    Router --> SyncController[Sync Controller]
    Router --> RepoController[Repository Controller]
    Router --> StatsController[Statistics Controller]

    SyncController --> SyncService[Sync Service]
    RepoController --> RepoService[Repository Service]
    StatsController --> StatsService[Statistics Service]

    SyncService --> GitHubClient[GitHub API Client]
    SyncService --> UserRepo[User Repository]
    SyncService --> RepoRepo[Repository Repository]

    RepoService --> RepoRepo
    RepoService --> CacheService[Cache Service Redis]

    StatsService --> StatsRepo[Statistics Repository]
    StatsService --> CacheService

    UserRepo --> Prisma[Prisma Client]
    RepoRepo --> Prisma
    StatsRepo --> Prisma

    Prisma --> PostgreSQL[(PostgreSQL Database)]

    SyncService --> LogService[Logging Service]
    RepoService --> LogService
    StatsService --> LogService
    GitHubClient --> LogService

    LogService --> LogQueue[Async Log Queue]
    LogQueue --> PostgreSQL

    style Client fill:#e1f5ff
    style PostgreSQL fill:#336791
    style GitHubClient fill:#24292e
    style CacheService fill:#dc382d
```

### Data Flow Diagram

```mermaid
graph LR
    A[Client Request] --> B{Request Type}

    B -->|POST /sync| C[Sync Controller]
    C --> D[Sync Service]
    D --> E[GitHub API Client]
    E --> F{API Response}
    F -->|Success| G[Transform Data]
    F -->|Error| H[Error Handler]
    G --> I[User Repository]
    G --> J[Repository Repository]
    I --> K[Prisma Upsert User]
    J --> L[Prisma Upsert Repos]
    K --> M[(Database)]
    L --> M
    M --> N[Return Sync Result]

    B -->|GET /repos| O[Repository Controller]
    O --> P[Repository Service]
    P --> Q{Check Cache}
    Q -->|Hit| R[Return Cached]
    Q -->|Miss| S[Repository Repository]
    S --> T[Prisma Query with Pagination]
    T --> M
    M --> U[Cache Result]
    U --> V[Return Repo List]

    B -->|GET /search| W[Repository Controller]
    W --> X[Repository Service]
    X --> Y[Build Search Query]
    Y --> Z[Repository Repository]
    Z --> AA[Prisma Full-Text Search]
    AA --> M
    M --> AB[Return Search Results]

    B -->|GET /stats| AC[Statistics Controller]
    AC --> AD[Statistics Service]
    AD --> AE{Check Cache}
    AE -->|Hit| AF[Return Cached]
    AE -->|Miss| AG[Statistics Repository]
    AG --> AH[Prisma Aggregations]
    AH --> M
    M --> AI[Cache Result]
    AI --> AJ[Return Statistics]

    H --> AK[Log Error]
    D --> AL[Log Request]
    P --> AL
    X --> AL
    AD --> AL
    AL --> AM[Log Queue]
    AM --> AN[Async Write to Logs Table]
    AN --> M
```

## Component Design

### 1. Controllers Layer

#### SyncController
**Responsibilities:**
- Handle POST requests to `/api/sync/:username`
- Validate username parameter using DTOs
- Delegate synchronization logic to SyncService
- Return synchronization results or error responses
- Apply rate limiting decorators

**Interfaces:**
```typescript
@Controller('api/sync')
@UseGuards(ThrottlerGuard)
export class SyncController {
  @Post(':username')
  @ApiOperation({ summary: 'Synchronize GitHub user repositories' })
  @ApiParam({ name: 'username', description: 'GitHub username' })
  @ApiResponse({ status: 200, type: SyncResultDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 502, description: 'GitHub API error' })
  async syncRepositories(
    @Param('username') username: string
  ): Promise<SyncResultDto>;
}
```

**Dependencies:**
- SyncService
- ValidationPipe
- ThrottlerGuard
- LoggingService

#### RepositoryController
**Responsibilities:**
- Handle GET requests to `/api/repos/:username` for listing
- Handle GET requests to `/api/search` for searching
- Validate query parameters (pagination, search keywords)
- Delegate business logic to RepositoryService
- Return formatted responses with pagination metadata

**Interfaces:**
```typescript
@Controller('api')
@UseGuards(ThrottlerGuard)
export class RepositoryController {
  @Get('repos/:username')
  @ApiOperation({ summary: 'List repositories for a user' })
  @ApiParam({ name: 'username', description: 'GitHub username' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, type: RepositoryListDto })
  async listRepositories(
    @Param('username') username: string,
    @Query() query: PaginationDto
  ): Promise<RepositoryListDto>;

  @Get('search')
  @ApiOperation({ summary: 'Search repositories by keywords' })
  @ApiQuery({ name: 'keywords', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, type: RepositoryListDto })
  async searchRepositories(
    @Query() query: SearchDto
  ): Promise<RepositoryListDto>;
}
```

**Dependencies:**
- RepositoryService
- ValidationPipe
- ThrottlerGuard
- LoggingService

#### StatisticsController
**Responsibilities:**
- Handle GET requests to `/api/stats`
- Validate query parameters (user filter, topN parameter)
- Delegate calculation logic to StatisticsService
- Return formatted statistics with proper typing

**Interfaces:**
```typescript
@Controller('api/stats')
@UseGuards(ThrottlerGuard)
export class StatisticsController {
  @Get()
  @ApiOperation({ summary: 'Generate repository statistics' })
  @ApiQuery({ name: 'user', required: false, type: String })
  @ApiQuery({ name: 'topN', required: false, type: Number })
  @ApiResponse({ status: 200, type: StatisticsDto })
  async getStatistics(
    @Query() query: StatisticsQueryDto
  ): Promise<StatisticsDto>;
}
```

**Dependencies:**
- StatisticsService
- ValidationPipe
- ThrottlerGuard
- LoggingService

### 2. Services Layer

#### SyncService
**Responsibilities:**
- Orchestrate synchronization workflow
- Call GitHubApiClient to fetch user and repository data
- Transform GitHub API responses to domain models
- Handle upsert operations via repositories
- Manage concurrency and prevent duplicate operations
- Handle GitHub API errors and rate limiting

**Interfaces:**
```typescript
@Injectable()
export class SyncService {
  async syncUserRepositories(username: string): Promise<SyncResult>;
  private async fetchGitHubUser(username: string): Promise<GitHubUserData>;
  private async fetchGitHubRepos(username: string): Promise<GitHubRepoData[]>;
  private async upsertUser(userData: GitHubUserData): Promise<User>;
  private async upsertRepositories(repos: GitHubRepoData[], userId: number): Promise<number>;
  private validateRepositoryData(repo: GitHubRepoData): boolean;
}
```

**Dependencies:**
- GitHubApiClient
- UserRepository
- RepositoryRepository
- LoggingService
- ConfigService

#### RepositoryService
**Responsibilities:**
- Implement business logic for listing and searching repositories
- Handle pagination calculations
- Implement caching strategy for frequently accessed data
- Build search queries with relevance ranking
- Format responses with metadata

**Interfaces:**
```typescript
@Injectable()
export class RepositoryService {
  async listUserRepositories(username: string, pagination: PaginationDto): Promise<RepositoryListResult>;
  async searchRepositories(keywords: string, pagination: PaginationDto): Promise<RepositoryListResult>;
  private calculatePaginationMetadata(total: number, page: number, pageSize: number): PaginationMetadata;
  private buildSearchQuery(keywords: string[]): SearchQuery;
  private getCacheKey(operation: string, params: any): string;
}
```

**Dependencies:**
- RepositoryRepository
- CacheService
- LoggingService
- ConfigService

#### StatisticsService
**Responsibilities:**
- Calculate global and user-specific statistics
- Aggregate language distributions
- Generate timeline histograms
- Rank users by repository count
- Implement caching for expensive calculations
- Handle topN parameter validation and capping

**Interfaces:**
```typescript
@Injectable()
export class StatisticsService {
  async calculateStatistics(user?: string, topN?: number): Promise<Statistics>;
  private async calculateGlobalStatistics(topN: number): Promise<GlobalStatistics>;
  private async calculateUserStatistics(username: string): Promise<UserStatistics>;
  private async aggregateLanguages(userFilter?: string): Promise<LanguageDistribution>;
  private async generateTimeline(userFilter?: string): Promise<TimelineHistogram>;
  private async rankTopUsers(limit: number): Promise<UserRanking[]>;
  private validateAndCapTopN(topN?: number): number;
}
```

**Dependencies:**
- StatisticsRepository
- CacheService
- LoggingService
- ConfigService

#### LoggingService
**Responsibilities:**
- Provide centralized logging interface
- Format logs in structured JSON format
- Queue log entries for asynchronous database writes
- Support multiple log levels (debug, info, warn, error)
- Include contextual information (request ID, endpoint, user)
- Implement automatic log retention cleanup

**Interfaces:**
```typescript
@Injectable()
export class LoggingService {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error: Error, context?: LogContext): void;
  private queueLogEntry(entry: LogEntry): void;
  private async processLogQueue(): Promise<void>;
  async cleanupOldLogs(): Promise<number>;
}
```

**Dependencies:**
- LogRepository
- ConfigService
- Queue (BullMQ or similar)

#### GitHubApiClient
**Responsibilities:**
- Encapsulate HTTP calls to GitHub API
- Handle authentication if tokens are configured
- Implement retry logic with exponential backoff
- Handle rate limit responses from GitHub
- Transform HTTP errors to domain errors
- Support timeout configuration

**Interfaces:**
```typescript
@Injectable()
export class GitHubApiClient {
  async getUser(username: string): Promise<GitHubUserData>;
  async getUserRepositories(username: string): Promise<GitHubRepoData[]>;
  private async makeRequest<T>(url: string, options?: RequestOptions): Promise<T>;
  private handleRateLimit(response: Response): Promise<void>;
  private retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number): Promise<T>;
}
```

**Dependencies:**
- HttpService (Axios)
- ConfigService
- LoggingService

#### CacheService
**Responsibilities:**
- Provide caching abstraction for Redis
- Generate cache keys with consistent formatting
- Set TTL (Time To Live) for cached entries
- Handle cache invalidation on data updates
- Provide fallback when Redis is unavailable

**Interfaces:**
```typescript
@Injectable()
export class CacheService {
  async get<T>(key: string): Promise<T | null>;
  async set<T>(key: string, value: T, ttl?: number): Promise<void>;
  async del(key: string): Promise<void>;
  async delPattern(pattern: string): Promise<void>;
  async invalidateUserCache(username: string): Promise<void>;
}
```

**Dependencies:**
- RedisClient
- ConfigService
- LoggingService

### 3. Repository Layer (Data Access)

#### UserRepository
**Responsibilities:**
- Abstract Prisma operations for User entity
- Implement upsert logic for user data
- Handle unique constraint violations
- Provide queries for user lookups

**Interfaces:**
```typescript
@Injectable()
export class UserRepository {
  async upsert(userData: CreateUserDto): Promise<User>;
  async findByUsername(username: string): Promise<User | null>;
  async findById(id: number): Promise<User | null>;
  async findAll(): Promise<User[]>;
}
```

**Dependencies:**
- PrismaService

#### RepositoryRepository
**Responsibilities:**
- Abstract Prisma operations for Repository entity
- Implement batch upsert for repositories
- Support pagination with efficient queries
- Implement full-text search with ranking
- Handle relationship loading with users

**Interfaces:**
```typescript
@Injectable()
export class RepositoryRepository {
  async upsertBatch(repos: CreateRepositoryDto[]): Promise<number>;
  async findByUser(username: string, pagination: PaginationDto): Promise<PaginatedResult<Repository>>;
  async search(keywords: string[], pagination: PaginationDto): Promise<PaginatedResult<Repository>>;
  async findById(id: number): Promise<Repository | null>;
  async count(filter?: RepositoryFilter): Promise<number>;
}
```

**Dependencies:**
- PrismaService

#### StatisticsRepository
**Responsibilities:**
- Execute complex aggregation queries
- Calculate language distributions
- Generate timeline histograms
- Rank users by repository count
- Optimize queries using database indexes

**Interfaces:**
```typescript
@Injectable()
export class StatisticsRepository {
  async getTotalRepositories(userFilter?: string): Promise<number>;
  async getTotalUsers(): Promise<number>;
  async getLanguageDistribution(userFilter?: string): Promise<LanguageStats[]>;
  async getTopUsersByRepos(limit: number): Promise<UserStats[]>;
  async getCreationTimeline(userFilter?: string): Promise<TimelineData[]>;
}
```

**Dependencies:**
- PrismaService

#### LogRepository
**Responsibilities:**
- Persist log entries to database
- Support async batch writes
- Implement log retention cleanup
- Provide log querying capabilities

**Interfaces:**
```typescript
@Injectable()
export class LogRepository {
  async create(logEntry: CreateLogDto): Promise<Log>;
  async createBatch(logEntries: CreateLogDto[]): Promise<number>;
  async deleteOlderThan(date: Date): Promise<number>;
  async findRecent(limit: number): Promise<Log[]>;
}
```

**Dependencies:**
- PrismaService

## Data Model

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int          @id @default(autoincrement())
  githubId      Int          @unique @map("github_id")
  login         String       @unique
  avatarUrl     String?      @map("avatar_url")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  repositories  Repository[]

  @@index([login])
  @@map("users")
}

model Repository {
  id              Int       @id @default(autoincrement())
  githubId        Int       @unique @map("github_id")
  name            String
  description     String?
  url             String
  language        String?
  createdAt       DateTime  @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  syncedAt        DateTime  @default(now()) @map("synced_at")
  userId          Int       @map("user_id")
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([name])
  @@index([language])
  @@index([createdAt])
  @@index([userId, createdAt])
  @@map("repositories")
}

model Log {
  id          Int       @id @default(autoincrement())
  timestamp   DateTime  @default(now())
  level       String    // debug, info, warn, error
  message     String
  context     Json?     // endpoint, method, requestId, etc.
  stackTrace  String?   @map("stack_trace")
  metadata    Json?     // additional structured data
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([timestamp])
  @@index([level])
  @@index([timestamp, level])
  @@map("logs")
}
```

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Repository : "has many"
    User {
        int id PK
        int githubId UK
        string login UK
        string avatarUrl
        datetime createdAt
        datetime updatedAt
    }
    Repository {
        int id PK
        int githubId UK
        string name
        string description
        string url
        string language
        datetime createdAt
        datetime updatedAt
        datetime syncedAt
        int userId FK
    }
    Log {
        int id PK
        datetime timestamp
        string level
        string message
        json context
        string stackTrace
        json metadata
        datetime createdAt
    }
```

### Key Data Model Decisions

1. **Separate User and Repository Tables**: One-to-many relationship allows efficient querying and normalization
2. **GitHub ID as Unique Constraint**: Prevents duplicates during sync operations using upsert
3. **Composite Indexes**: `[userId, createdAt]` supports efficient ordered queries per user
4. **Nullable Fields**: `description`, `avatarUrl`, and `language` can be null to handle missing GitHub data
5. **Cascade Deletion**: Repositories are deleted when user is deleted to maintain referential integrity
6. **Timestamp Tracking**: Separate `createdAt` (GitHub creation) and `syncedAt` (local sync time) fields
7. **JSON Fields in Logs**: Flexible storage for contextual information without schema changes
8. **Log Indexes**: Composite index on `[timestamp, level]` supports efficient filtering and cleanup queries

## Business Process

### Process 1: Repository Synchronization Flow

```mermaid
flowchart TD
    A[Client Request POST /api/sync/:username] --> B[SyncController.syncRepositories]
    B --> C[Apply Rate Limiting]
    C --> D{Rate Limit OK?}
    D -->|No| E[Return 429 Too Many Requests]
    D -->|Yes| F[Validate Username DTO]
    F --> G{Valid Username?}
    G -->|No| H[Return 400 Bad Request]
    G -->|Yes| I[SyncService.syncUserRepositories]

    I --> J[GitHubApiClient.getUser]
    J --> K{User Found?}
    K -->|No| L[Log Error]
    L --> M[Return 404 Not Found]
    K -->|Yes| N[GitHubApiClient.getUserRepositories]

    N --> O{Repos Retrieved?}
    O -->|No| P[Handle GitHub Error]
    P --> Q{Rate Limit?}
    Q -->|Yes| R[Return 429 Rate Limit]
    Q -->|No| S[Return 502 Bad Gateway]

    O -->|Yes| T[Transform User Data]
    T --> U[UserRepository.upsert]
    U --> V[Begin Transaction]
    V --> W[Prisma Upsert User]

    O --> X[Transform Repo Data Array]
    X --> Y[Validate Each Repository]
    Y --> Z{All Valid?}
    Z -->|No| AA[Filter Invalid Repos]
    Z -->|Yes| AB[RepositoryRepository.upsertBatch]
    AA --> AB

    AB --> AC[Prisma Upsert Repos Loop]
    AC --> AD[Commit Transaction]
    AD --> AE[CacheService.invalidateUserCache]
    AE --> AF[LoggingService.info]
    AF --> AG[Return SyncResultDto]
    AG --> AH[200 OK Response]
```

### Process 2: Repository Listing Flow

```mermaid
flowchart TD
    A[Client Request GET /api/repos/:username] --> B[RepositoryController.listRepositories]
    B --> C[Validate Username and PaginationDto]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[RepositoryService.listUserRepositories]

    F --> G[CacheService.getCacheKey]
    G --> H[CacheService.get]
    H --> I{Cache Hit?}
    I -->|Yes| J[Return Cached Result]
    J --> K[200 OK Response]

    I -->|No| L[RepositoryRepository.findByUser]
    L --> M[Build Prisma Query]
    M --> N[Apply Pagination skip and take]
    N --> O[Apply Ordering by createdAt DESC]
    O --> P[Include User Relation]
    P --> Q[Execute Query]

    Q --> R[RepositoryRepository.count]
    R --> S[Count Total Matching Repos]
    S --> T[RepositoryService.calculatePaginationMetadata]
    T --> U[Calculate totalPages and hasNext]
    U --> V[Format RepositoryListDto]
    V --> W[CacheService.set with TTL]
    W --> X[LoggingService.info]
    X --> Y[Return Result]
    Y --> K
```

### Process 3: Repository Search Flow

```mermaid
flowchart TD
    A[Client Request GET /api/search?keywords=x] --> B[RepositoryController.searchRepositories]
    B --> C[Validate SearchDto]
    C --> D{Valid Keywords?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[RepositoryService.searchRepositories]

    F --> G[Split Keywords by Spaces]
    G --> H[Sanitize Each Keyword]
    H --> I[Build Search Query OR Conditions]
    I --> J[RepositoryRepository.search]

    J --> K[Build Prisma Where Clause]
    K --> L[Create OR Array]
    L --> M[name contains keyword Case Insensitive]
    L --> N[description contains keyword Case Insensitive]
    L --> O[language equals keyword Case Insensitive]

    M --> P[Apply Pagination]
    N --> P
    O --> P
    P --> Q[Order by Relevance and createdAt]
    Q --> R[Execute Query]
    R --> S[Count Total Matches]
    S --> T[Calculate Pagination Metadata]
    T --> U[Format RepositoryListDto]
    U --> V[LoggingService.info]
    V --> W[Return Results]
    W --> X[200 OK Response]
```

### Process 4: Statistics Generation Flow

```mermaid
flowchart TD
    A[Client Request GET /api/stats?user=x&topN=10] --> B[StatisticsController.getStatistics]
    B --> C[Validate StatisticsQueryDto]
    C --> D{Valid topN?}
    D -->|Invalid| E[Return 400 Bad Request]
    D -->|Valid| F[StatisticsService.validateAndCapTopN]
    F --> G{topN > 20?}
    G -->|Yes| H[Cap topN at 20]
    G -->|No| I[Use Provided topN]
    H --> J[StatisticsService.calculateStatistics]
    I --> J

    J --> K{User Filter?}
    K -->|No| L[Calculate Global Statistics]
    K -->|Yes| M[Calculate User Statistics]

    L --> N[StatisticsRepository.getTotalRepositories]
    L --> O[StatisticsRepository.getTotalUsers]
    L --> P[StatisticsRepository.getTopUsersByRepos with limit]

    M --> Q[StatisticsRepository.getTotalRepositories with user filter]

    L --> R[StatisticsRepository.getLanguageDistribution]
    M --> R
    R --> S[Group By Language]
    S --> T[Count Repositories Per Language]
    T --> U[Order By Count DESC]

    L --> V[StatisticsRepository.getCreationTimeline]
    M --> V
    V --> W[Extract Year and Month from createdAt]
    W --> X[Group By Year-Month]
    X --> Y[Count Per Month]
    Y --> Z[Fill Missing Months with Zero]

    N --> AA[Aggregate Results]
    O --> AA
    P --> AA
    Q --> AA
    U --> AA
    Z --> AA

    AA --> AB[Format StatisticsDto]
    AB --> AC[CacheService.set with TTL]
    AC --> AD[LoggingService.info]
    AD --> AE[Return Statistics]
    AE --> AF[200 OK Response]
```

### Process 5: Asynchronous Logging Flow

```mermaid
sequenceDiagram
    participant Service
    participant LoggingService
    participant LogQueue
    participant Worker
    participant LogRepository
    participant Database

    Service->>LoggingService: log info, warn, or error
    LoggingService->>LoggingService: Format log entry with context
    LoggingService->>LogQueue: Add log entry to queue
    LoggingService-->>Service: Return immediately non-blocking

    Note over Worker: Background Process
    Worker->>LogQueue: Poll for log entries
    LogQueue-->>Worker: Return batch of log entries
    Worker->>LogRepository: createBatch with log entries
    LogRepository->>Database: INSERT INTO logs bulk
    Database-->>LogRepository: Confirm writes
    LogRepository-->>Worker: Return count of written logs

    Note over Worker: Scheduled Job daily
    Worker->>LogRepository: Calculate retention date
    LogRepository->>Database: DELETE FROM logs WHERE timestamp < date
    Database-->>LogRepository: Return deleted count
```

## Error Handling Strategy

### Error Categories and Responses

#### 1. Client Errors (4xx)

**400 Bad Request**
- Invalid input parameters (missing, malformed, type mismatch)
- Invalid pagination values (negative page numbers)
- Empty or malformed search keywords
- topN parameter out of acceptable range

```typescript
{
  statusCode: 400,
  message: "Validation failed",
  errors: [
    {
      field: "page",
      message: "page must be a positive number"
    }
  ],
  timestamp: "2025-10-11T10:30:00Z"
}
```

**404 Not Found**
- GitHub username does not exist
- No repositories found for user (returns empty array with 200 instead)

```typescript
{
  statusCode: 404,
  message: "GitHub user not found",
  error: "Not Found",
  timestamp: "2025-10-11T10:30:00Z"
}
```

**429 Too Many Requests**
- Rate limit exceeded (from Throttler guard)
- GitHub API rate limit exhausted

```typescript
{
  statusCode: 429,
  message: "Rate limit exceeded. Please try again later.",
  retryAfter: 60,
  timestamp: "2025-10-11T10:30:00Z"
}
```

#### 2. Server Errors (5xx)

**500 Internal Server Error**
- Unexpected application errors
- Database connection failures
- Unhandled exceptions

```typescript
{
  statusCode: 500,
  message: "Internal server error",
  error: "Internal Server Error",
  timestamp: "2025-10-11T10:30:00Z"
}
```

**502 Bad Gateway**
- GitHub API is down or unreachable
- GitHub API returns unexpected errors
- Network timeout to GitHub

```typescript
{
  statusCode: 502,
  message: "Failed to connect to GitHub API",
  error: "Bad Gateway",
  timestamp: "2025-10-11T10:30:00Z"
}
```

**503 Service Unavailable**
- Database is unavailable
- Redis cache is unavailable (degrades gracefully)

```typescript
{
  statusCode: 503,
  message: "Service temporarily unavailable",
  error: "Service Unavailable",
  timestamp: "2025-10-11T10:30:00Z"
}
```

### Error Handling Implementation

#### Global Exception Filter

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = this.getHttpStatus(exception);
    const errorResponse = this.buildErrorResponse(exception, request);

    // Log error with full context
    this.loggingService.error(
      errorResponse.message,
      exception as Error,
      {
        endpoint: request.url,
        method: request.method,
        statusCode: status
      }
    );

    // Sanitize error for client
    response.status(status).json(errorResponse);
  }
}
```

#### Service-Level Error Handling

```typescript
@Injectable()
export class SyncService {
  async syncUserRepositories(username: string): Promise<SyncResult> {
    try {
      const user = await this.githubClient.getUser(username);
      // ... synchronization logic
    } catch (error) {
      if (error instanceof GitHubNotFoundException) {
        throw new NotFoundException(`GitHub user '${username}' not found`);
      }
      if (error instanceof GitHubRateLimitException) {
        throw new HttpException(
          'GitHub rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      if (error instanceof GitHubApiException) {
        throw new BadGatewayException('Failed to connect to GitHub API');
      }
      // Unexpected errors
      this.logger.error('Unexpected error during sync', error);
      throw new InternalServerErrorException('Synchronization failed');
    }
  }
}
```

#### Retry Logic with Exponential Backoff

```typescript
@Injectable()
export class GitHubApiClient {
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on client errors
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        // Calculate backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await this.sleep(delay);

        this.logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
          delay,
          error: error.message
        });
      }
    }

    throw lastError;
  }
}
```

### Error Prevention Strategies

1. **Input Validation**: Use class-validator decorators on all DTOs
2. **Database Constraints**: Leverage Prisma schema constraints and unique indexes
3. **Transaction Management**: Wrap multi-step operations in database transactions
4. **Timeout Configuration**: Set reasonable timeouts for external API calls
5. **Circuit Breaker**: Implement circuit breaker pattern for GitHub API calls (future enhancement)
6. **Graceful Degradation**: Cache service failure doesn't break core functionality

## Testing Strategy

### Testing Pyramid

```mermaid
graph TD
    A[E2E Tests 10%] --> B[Integration Tests 20%]
    B --> C[Unit Tests 70%]

    style A fill:#ff6b6b
    style B fill:#ffd93d
    style C fill:#6bcf7f
```

### 1. Unit Tests (70% of total tests)

**Target Coverage: 70% minimum code coverage**

#### Services Layer
- **SyncService**: Mock GitHubApiClient and repositories
  - Test successful synchronization flow
  - Test GitHub user not found scenario
  - Test GitHub API rate limit handling
  - Test data validation and filtering
  - Test transaction rollback on errors

- **RepositoryService**: Mock RepositoryRepository and CacheService
  - Test pagination calculations
  - Test cache hit and miss scenarios
  - Test search query building
  - Test empty result handling

- **StatisticsService**: Mock StatisticsRepository and CacheService
  - Test global statistics calculation
  - Test user-specific statistics
  - Test topN validation and capping
  - Test language aggregation
  - Test timeline generation with missing months

- **LoggingService**: Mock LogRepository and Queue
  - Test log formatting with different levels
  - Test context attachment
  - Test async queue processing
  - Test log cleanup with retention policy

#### Repository Layer
- **UserRepository**: Use in-memory or test database
  - Test upsert creates new user
  - Test upsert updates existing user
  - Test unique constraint handling

- **RepositoryRepository**: Use in-memory or test database
  - Test batch upsert operations
  - Test pagination with various page sizes
  - Test search with multiple keywords
  - Test ordering by relevance

- **StatisticsRepository**: Use in-memory or test database
  - Test aggregation queries return correct counts
  - Test language grouping
  - Test timeline date formatting

#### Utilities and Helpers
- Test DTO validation rules
- Test transformation functions
- Test utility functions (date formatting, string sanitization)

**Testing Tools:**
- Jest as test runner
- @nestjs/testing for dependency injection in tests
- jest-mock-extended for type-safe mocking

**Example Unit Test:**

```typescript
describe('SyncService', () => {
  let service: SyncService;
  let githubClient: jest.Mocked<GitHubApiClient>;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: GitHubApiClient,
          useValue: createMock<GitHubApiClient>()
        },
        {
          provide: UserRepository,
          useValue: createMock<UserRepository>()
        }
      ]
    }).compile();

    service = module.get<SyncService>(SyncService);
    githubClient = module.get(GitHubApiClient);
  });

  it('should sync user repositories successfully', async () => {
    // Arrange
    githubClient.getUser.mockResolvedValue(mockGitHubUser);
    githubClient.getUserRepositories.mockResolvedValue(mockGitHubRepos);
    userRepository.upsert.mockResolvedValue(mockUser);

    // Act
    const result = await service.syncUserRepositories('testuser');

    // Assert
    expect(result.repositoriesSynced).toBe(5);
    expect(githubClient.getUser).toHaveBeenCalledWith('testuser');
    expect(userRepository.upsert).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundException when user does not exist', async () => {
    // Arrange
    githubClient.getUser.mockRejectedValue(
      new GitHubNotFoundException('User not found')
    );

    // Act & Assert
    await expect(
      service.syncUserRepositories('nonexistent')
    ).rejects.toThrow(NotFoundException);
  });
});
```

### 2. Integration Tests (20% of total tests)

**Target: Test API endpoints with real database (test container)**

#### Test Database Setup
- Use Testcontainers to spin up PostgreSQL in Docker
- Apply migrations before each test suite
- Clean database between tests

#### Endpoint Tests
- **POST /api/sync/:username**
  - Test successful sync creates records in database
  - Test sync updates existing records
  - Test concurrent sync requests
  - Test invalid username returns 404

- **GET /api/repos/:username**
  - Test returns paginated results
  - Test pagination metadata is correct
  - Test empty results for non-existent user
  - Test ordering by creation date

- **GET /api/search**
  - Test search by name returns matching repos
  - Test search by language returns matching repos
  - Test search with multiple keywords
  - Test case-insensitive matching

- **GET /api/stats**
  - Test global statistics calculation
  - Test user-specific statistics
  - Test topN parameter capping
  - Test language distribution accuracy

**Testing Tools:**
- supertest for HTTP assertions
- @testcontainers/postgresql for test database
- @nestjs/testing for application bootstrap

**Example Integration Test:**

```typescript
describe('Repository Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.repository.deleteMany();
    await prisma.user.deleteMany();
  });

  it('/api/repos/:username (GET) returns paginated repositories', async () => {
    // Arrange: Create test data
    await createTestUser('testuser');
    await createTestRepositories('testuser', 15);

    // Act
    const response = await request(app.getHttpServer())
      .get('/api/repos/testuser?page=1&pageSize=10')
      .expect(200);

    // Assert
    expect(response.body.data).toHaveLength(10);
    expect(response.body.pagination.totalCount).toBe(15);
    expect(response.body.pagination.totalPages).toBe(2);
  });
});
```

### 3. End-to-End Tests (10% of total tests)

**Target: Test complete user workflows**

- **Workflow 1: New user synchronization and retrieval**
  - Sync user repositories from GitHub (mocked)
  - List repositories for that user
  - Search for specific repository
  - Generate statistics including that user

- **Workflow 2: Data update and cache invalidation**
  - Sync user once
  - Query repositories (cache miss)
  - Query repositories again (cache hit)
  - Sync user again with new data
  - Verify cache was invalidated
  - Verify new data is returned

- **Workflow 3: Error handling and recovery**
  - Attempt sync with invalid username
  - Verify error response
  - Attempt sync with valid username
  - Verify success response

**Testing Tools:**
- Same as integration tests but testing multiple endpoints in sequence
- Mock GitHub API responses using nock or msw

### 4. Test Doubles Strategy

**Mocking Strategy:**
- **Unit Tests**: Mock all dependencies (repositories, external services)
- **Integration Tests**: Use real database, mock external APIs (GitHub)
- **E2E Tests**: Use real database, mock external APIs

**GitHub API Mocking:**
```typescript
// Mock GitHub API responses for predictable testing
const mockGitHubUser = {
  id: 12345,
  login: 'testuser',
  avatar_url: 'https://avatars.githubusercontent.com/u/12345'
};

const mockGitHubRepos = [
  {
    id: 1,
    name: 'test-repo-1',
    description: 'Test repository',
    html_url: 'https://github.com/testuser/test-repo-1',
    language: 'TypeScript',
    created_at: '2024-01-01T00:00:00Z'
  }
];
```

### 5. Test Coverage Requirements

**Minimum Coverage Thresholds:**
- **Overall**: 70%
- **Services**: 80%
- **Repositories**: 75%
- **Controllers**: 60%
- **DTOs/Models**: 50%

**Coverage Reporting:**
```bash
npm run test:cov
```

**CI/CD Integration:**
- Run tests on every pull request
- Fail build if coverage drops below 70%
- Generate coverage reports and upload to code coverage service

### 6. Testing Best Practices

1. **Arrange-Act-Assert Pattern**: Structure all tests with clear setup, execution, and verification
2. **Test Isolation**: Each test should be independent and not rely on others
3. **Descriptive Test Names**: Use "should... when..." naming convention
4. **Fast Tests**: Unit tests should complete in milliseconds
5. **Deterministic Tests**: No random data, fixed dates and times
6. **Test Data Builders**: Create reusable factories for test data
7. **Clean Up**: Always clean up test data and resources
8. **Mock External Dependencies**: Never call real GitHub API in tests

## Security Considerations

### 1. Rate Limiting Configuration

**Implementation using @nestjs/throttler:**

```typescript
// Global rate limiting
ThrottlerModule.forRoot({
  ttl: 60, // Time window in seconds
  limit: 100, // Max requests per ttl
  ignoreUserAgents: [/health-check/],
  storage: new ThrottlerStorageRedisService(redis)
})

// Endpoint-specific overrides
@Throttle(10, 60) // 10 requests per minute
@Post('sync/:username')
async syncRepositories() { }
```

**Rate Limits by Endpoint:**
- Global: 100 requests per minute per IP
- POST /api/sync/:username: 10 requests per minute (expensive operation)
- GET /api/repos/:username: 100 requests per minute
- GET /api/search: 50 requests per minute
- GET /api/stats: 30 requests per minute

### 2. CORS Configuration

```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600
});
```

### 3. Input Validation and Sanitization

**Using class-validator:**

```typescript
export class SearchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => sanitizeInput(value))
  keywords: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number = 1;
}
```

**SQL Injection Prevention:**
- Use Prisma parameterized queries (never raw SQL with string interpolation)
- Validate and sanitize all user inputs
- Use TypeScript types for compile-time safety

### 4. Sensitive Data Protection

**Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/github_api
GITHUB_API_TOKEN=ghp_xxxxxxxxxxxx  # Optional, for higher rate limits
REDIS_URL=redis://localhost:6379
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
ALLOWED_ORIGINS=https://example.com,https://app.example.com
```

**Security Best Practices:**
- Never commit .env files
- Use secrets management in production (AWS Secrets Manager, Vault)
- Rotate API tokens regularly
- Log without exposing sensitive information

### 5. HTTPS and Secure Headers

**Helmet.js Integration:**

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 6. Authentication (Future Enhancement)

**Current State:**
- Public API with rate limiting only

**Future Implementation:**
- API key authentication
- JWT tokens for user sessions
- Role-based access control (RBAC)
- OAuth integration for GitHub authentication

## Performance Optimization

### 1. Database Indexing Strategy

**Indexes Defined in Prisma Schema:**
- Single column indexes: `login`, `name`, `language`, `createdAt`, `timestamp`, `level`
- Composite indexes: `[userId, createdAt]`, `[timestamp, level]`
- Unique indexes: `githubId` on both User and Repository tables

**Index Usage:**
- User lookup by login: Uses `login` index
- Repository listing by user: Uses `userId` index + `createdAt` for ordering
- Repository search: Uses `name` and `language` indexes
- Statistics timeline: Uses `createdAt` index
- Log cleanup: Uses `timestamp` index

### 2. Query Optimization

**Pagination:**
```typescript
// Efficient pagination using skip and take
const repositories = await prisma.repository.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' }
});
```

**Select Specific Fields:**
```typescript
// Only fetch needed fields
const stats = await prisma.repository.groupBy({
  by: ['language'],
  _count: { id: true },
  where: { userId: userFilter }
});
```

**Connection Pooling:**
```typescript
// Prisma Client connection pool configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Default pool size: 10
}
```

### 3. Caching Strategy

**Redis Cache Layers:**

1. **Repository Lists**: TTL 5 minutes
   - Key pattern: `repos:user:{username}:page:{page}:size:{pageSize}`
   - Invalidation: On sync for that user

2. **Search Results**: TTL 3 minutes
   - Key pattern: `search:{keywords}:page:{page}:size:{pageSize}`
   - Invalidation: On any repository update

3. **Statistics**: TTL 10 minutes
   - Key pattern: `stats:global` or `stats:user:{username}`
   - Invalidation: On any repository creation/update

**Cache Implementation:**
```typescript
async listUserRepositories(username: string, pagination: PaginationDto) {
  const cacheKey = `repos:user:${username}:page:${pagination.page}`;

  // Try cache first
  const cached = await this.cacheService.get(cacheKey);
  if (cached) return cached;

  // Cache miss: Query database
  const result = await this.repository.findByUser(username, pagination);

  // Store in cache
  await this.cacheService.set(cacheKey, result, 300); // 5 minutes

  return result;
}
```

### 4. Async Processing

**Background Jobs:**
- Log writes processed asynchronously using BullMQ
- Log retention cleanup scheduled daily at midnight
- Cache warming for frequently accessed data (future enhancement)

**Batch Operations:**
- Repository upsert uses batch insert for efficiency
- Log writes batched every 1 second or 100 entries

### 5. Response Time Targets

- **Sync endpoint**: < 5 seconds for users with 100 repositories
- **List endpoint**: < 500ms for cached results, < 2 seconds for uncached
- **Search endpoint**: < 3 seconds for 10,000 repositories
- **Stats endpoint**: < 5 seconds for 100,000 repositories

## Deployment Architecture

### Docker Compose Setup

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: github-api-postgres
    environment:
      POSTGRES_USER: github_api
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: github_api
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U github_api"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: github-api-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: github-api-app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://github_api:${DB_PASSWORD}@postgres:5432/github_api
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Multi-Stage Dockerfile

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Run migrations and start application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

### Environment-Specific Configuration

**Development (.env.development):**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/github_api_dev
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=1000
```

**Production (.env.production):**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
LOG_LEVEL=info
ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

## Documentation Strategy

### 1. OpenAPI/Swagger Documentation

**Implementation:**
```typescript
const config = new DocumentBuilder()
  .setTitle('GitHub Repository Management API')
  .setDescription('API for synchronizing and analyzing GitHub repository data')
  .setVersion('1.0')
  .addTag('sync', 'Repository synchronization operations')
  .addTag('repositories', 'Repository listing and search operations')
  .addTag('statistics', 'Statistical analysis operations')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

**Access:** `http://localhost:3000/api/docs`

### 2. README.md Structure

```markdown
# GitHub Repository Management API

## Overview
[Project description and purpose]

## Features
- Repository synchronization from GitHub
- Advanced search capabilities
- Statistical analysis and insights
- RESTful API with OpenAPI documentation

## Technology Stack
- Node.js 20
- NestJS 10
- TypeScript 5
- PostgreSQL 16
- Prisma ORM 5
- Redis 7
- Docker & Docker Compose

## Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)

## Quick Start
[Step-by-step setup instructions]

## API Endpoints
[Brief overview with links to Swagger]

## Testing
[How to run tests]

## Contributing
[Contribution guidelines]
```

### 3. VitePress Documentation

**Structure:**
```
docs/
├── .vitepress/
│   └── config.ts
├── index.md (Home)
├── getting-started/
│   ├── installation.md
│   └── quick-start.md
├── architecture/
│   ├── overview.md
│   ├── components.md
│   └── data-model.md
├── api/
│   ├── sync.md
│   ├── repositories.md
│   ├── search.md
│   └── statistics.md
├── deployment/
│   └── docker.md
└── development/
    ├── testing.md
    └── contributing.md
```

**Commands:**
```bash
npm run docs:dev   # Start documentation server
npm run docs:build # Build static site
```

## Summary

This design document provides a comprehensive blueprint for implementing the GitHub Repository Management API with the following key architectural decisions:

1. **Layered Architecture** with controllers, services, and repositories for separation of concerns
2. **Prisma ORM** for type-safe database operations with PostgreSQL
3. **Redis Caching** for performance optimization with strategic TTLs
4. **Asynchronous Logging** with database persistence and 30-day retention
5. **Rate Limiting** using NestJS Throttler with Redis storage for scalability
6. **Comprehensive Testing** strategy targeting 70% code coverage
7. **Docker Containerization** with multi-stage builds and health checks
8. **Security Best Practices** including input validation, CORS, and secure error handling
9. **Performance Optimization** through indexing, caching, and connection pooling
10. **Extensive Documentation** with OpenAPI/Swagger, README, and VitePress

The design addresses all requirements from the requirements document while incorporating modern best practices and architectural patterns for building scalable, maintainable, and performant NestJS applications.
