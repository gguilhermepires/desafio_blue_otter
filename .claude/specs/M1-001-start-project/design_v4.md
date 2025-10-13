# Design Document: GitHub Repository Management API

## Overview

### Design Goals

The GitHub Repository Management API is a RESTful back-end service designed to provide an intermediary layer between GitHub's public API and client applications. The system aims to:

1. **Persistent Data Storage**: Cache GitHub repository and user data in a local PostgreSQL database to reduce dependency on GitHub API availability and rate limits
2. **Enhanced Search Capabilities**: Provide advanced search functionality across repository names, descriptions, and programming languages
3. **Statistical Analytics**: Generate aggregated insights about repository distributions, language usage, and temporal trends
4. **Performance Optimization**: Deliver sub-second query performance for common operations through indexed database queries

### Scope

**In Scope:**
- Four REST API endpoints: synchronization, listing, search, and statistics
- PostgreSQL database with Prisma ORM for type-safe data operations
- Docker containerization with docker-compose orchestration
- Comprehensive API documentation (Swagger/OpenAPI) and project documentation (README.md + VitePress)
- Security features including rate limiting, CORS configuration, and input validation
- Asynchronous database logging system with 30-day retention policy
- Automated testing achieving 70% code coverage

**Out of Scope:**
- User authentication and authorization (public API)
- GitHub webhook integration for real-time synchronization
- Advanced caching strategies (Redis, CDN)
- Multi-tenancy support
- Graphical user interface

### Key Design Decisions

1. **NestJS Framework**: Selected for its robust dependency injection system, modular architecture, built-in validation, and excellent TypeScript support
2. **Prisma ORM**: Chosen for type-safe database interactions, automatic migration management, and superior developer experience
3. **Layered Architecture**: Implements clear separation between controllers, services, and repositories following clean architecture principles
4. **Asynchronous Logging**: Database logs are written asynchronously to avoid blocking API request processing
5. **PostgreSQL**: Relational database selected for ACID compliance, excellent indexing capabilities, and proven scalability

## Architecture Design

### System Architecture Diagram

```mermaid
graph TB
    Client[API Clients] --> RateLimit[Rate Limiting Middleware]
    RateLimit --> CORS[CORS Middleware]
    CORS --> Validation[Validation Middleware]
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
    StatsService --> RepoRepo
    StatsService --> UserRepo

    UserRepo --> Prisma[Prisma Client]
    RepoRepo --> Prisma

    Prisma --> PostgreSQL[(PostgreSQL Database)]

    SyncService --> LogService[Logging Service]
    RepoService --> LogService
    StatsService --> LogService

    LogService --> LogQueue[Async Log Queue]
    LogQueue --> LogRepo[Log Repository]
    LogRepo --> Prisma

    style PostgreSQL fill:#4169E1,stroke:#000,stroke-width:2px,color:#fff
    style Client fill:#90EE90,stroke:#000,stroke-width:2px
    style GitHubClient fill:#FFA500,stroke:#000,stroke-width:2px
```

### Data Flow Diagram

**Synchronization Flow:**

```mermaid
graph LR
    A[Client Request] --> B[Sync Controller]
    B --> C[Validate Username DTO]
    C --> D[Sync Service]
    D --> E[Call GitHub User API]
    E --> F[Call GitHub Repos API]
    F --> G[Transform API Response]
    G --> H{User Exists?}
    H -->|Yes| I[Update User]
    H -->|No| J[Create User]
    I --> K[Process Repositories]
    J --> K
    K --> L{Repository Exists?}
    L -->|Yes| M[Update Repository]
    L -->|No| N[Create Repository]
    M --> O[Return Sync Result]
    N --> O
    O --> P[Log Request to DB Async]
```

**Search Flow:**

```mermaid
graph LR
    A[Client Request] --> B[Repository Controller]
    B --> C[Validate Search DTO]
    C --> D[Repository Service]
    D --> E[Build Search Query]
    E --> F[Repository Repository]
    F --> G[Execute Prisma Query with Filters]
    G --> H[PostgreSQL Full-Text Search]
    H --> I[Apply Pagination]
    I --> J[Transform to Response DTO]
    J --> K[Return Results]
    K --> L[Log Request to DB Async]
```

## Component Design

### Controllers Layer

Controllers handle HTTP request/response cycles, delegating business logic to services.

#### SyncController

**Responsibilities:**
- Receive synchronization requests with GitHub username
- Validate input using DTOs with validation decorators
- Delegate synchronization logic to SyncService
- Return formatted response with sync statistics

**Interfaces:**
```typescript
@Controller('sync')
export class SyncController {
  @Post(':username')
  @ApiOperation({ summary: 'Synchronize GitHub user repositories' })
  @ApiResponse({ status: 200, type: SyncResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 502, description: 'GitHub API error' })
  async syncRepositories(
    @Param() params: UsernameParamDto
  ): Promise<SyncResponseDto>;
}
```

**Dependencies:**
- SyncService
- LoggingService

#### RepositoryController

**Responsibilities:**
- Handle repository listing requests with pagination
- Handle repository search requests with keyword filtering
- Validate query parameters (page, pageSize, keywords)
- Transform service responses to API response DTOs

**Interfaces:**
```typescript
@Controller('repositories')
export class RepositoryController {
  @Get('user/:username')
  @ApiOperation({ summary: 'List repositories for a user' })
  @ApiResponse({ status: 200, type: PaginatedRepositoryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async listRepositories(
    @Param() params: UsernameParamDto,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedRepositoryResponseDto>;

  @Get('search')
  @ApiOperation({ summary: 'Search repositories by keywords' })
  @ApiResponse({ status: 200, type: PaginatedRepositoryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  async searchRepositories(
    @Query() query: SearchQueryDto
  ): Promise<PaginatedRepositoryResponseDto>;
}
```

**Dependencies:**
- RepositoryService
- LoggingService

#### StatisticsController

**Responsibilities:**
- Handle global statistics requests
- Handle user-specific statistics requests
- Validate topN parameter (1-20 range)
- Format statistics responses with summary, languages, top users, and timeline

**Interfaces:**
```typescript
@Controller('statistics')
export class StatisticsController {
  @Get()
  @ApiOperation({ summary: 'Get global or user-specific statistics' })
  @ApiResponse({ status: 200, type: StatisticsResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getStatistics(
    @Query() query: StatisticsQueryDto
  ): Promise<StatisticsResponseDto>;
}
```

**Dependencies:**
- StatisticsService
- LoggingService

### Service Layer

Services contain business logic, orchestrate data operations, and interact with external APIs.

#### SyncService

**Responsibilities:**
- Fetch user data from GitHub API
- Fetch repository data from GitHub API
- Transform GitHub API responses to domain models
- Coordinate upsert operations for users and repositories
- Handle GitHub API errors and rate limits
- Implement retry logic with exponential backoff

**Interfaces:**
```typescript
@Injectable()
export class SyncService {
  async syncUserRepositories(username: string): Promise<SyncResult>;

  private async fetchGitHubUser(username: string): Promise<GitHubUser>;

  private async fetchGitHubRepositories(username: string): Promise<GitHubRepository[]>;

  private async upsertUser(userData: GitHubUser): Promise<User>;

  private async upsertRepositories(
    userId: number,
    repositories: GitHubRepository[]
  ): Promise<Repository[]>;

  private handleGitHubError(error: any): never;
}
```

**Dependencies:**
- HttpService (for GitHub API calls)
- UserRepository
- RepositoryRepository
- ConfigService (for GitHub API configuration)

#### RepositoryService

**Responsibilities:**
- Query repositories by username with pagination
- Search repositories by keywords across multiple fields
- Apply relevance ranking to search results
- Transform database entities to response DTOs

**Interfaces:**
```typescript
@Injectable()
export class RepositoryService {
  async listByUsername(
    username: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<Repository>>;

  async searchRepositories(
    keywords: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<Repository>>;

  private buildSearchQuery(keywords: string): Prisma.RepositoryWhereInput;

  private applyRelevanceRanking(
    repositories: Repository[],
    keywords: string
  ): Repository[];
}
```

**Dependencies:**
- RepositoryRepository

#### StatisticsService

**Responsibilities:**
- Calculate global statistics across all users
- Calculate user-specific statistics
- Aggregate language distributions
- Rank users by repository count
- Generate monthly timeline histograms
- Handle zero-count months in timelines

**Interfaces:**
```typescript
@Injectable()
export class StatisticsService {
  async getGlobalStatistics(topN: number): Promise<Statistics>;

  async getUserStatistics(username: string, topN: number): Promise<Statistics>;

  private async calculateSummary(userId?: number): Promise<StatisticsSummary>;

  private async aggregateLanguages(userId?: number): Promise<LanguageDistribution>;

  private async rankUsersByRepoCount(topN: number): Promise<UserRanking[]>;

  private async generateMonthlyTimeline(userId?: number): Promise<MonthlyTimeline>;

  private fillTimelineGaps(timeline: MonthlyTimeline): MonthlyTimeline;
}
```

**Dependencies:**
- RepositoryRepository
- UserRepository

#### LoggingService

**Responsibilities:**
- Log API requests with context (endpoint, method, status)
- Log errors with stack traces
- Log external API calls to GitHub
- Queue log entries for asynchronous database writes
- Process log queue in background
- Automatically delete logs older than 30 days

**Interfaces:**
```typescript
@Injectable()
export class LoggingService implements OnModuleInit {
  async logRequest(context: RequestContext): Promise<void>;

  async logError(error: Error, context: any): Promise<void>;

  async logExternalApiCall(
    service: string,
    endpoint: string,
    status: 'success' | 'failure',
    metadata?: any
  ): Promise<void>;

  private async processLogQueue(): Promise<void>;

  private async deleteOldLogs(): Promise<void>;
}
```

**Dependencies:**
- LogRepository
- ConfigService (for retention period configuration)

### Repository Layer

Repositories abstract database operations using Prisma Client.

#### UserRepository

**Responsibilities:**
- CRUD operations for User entity
- Find user by GitHub ID or username
- Count total users

**Interfaces:**
```typescript
@Injectable()
export class UserRepository {
  async create(data: Prisma.UserCreateInput): Promise<User>;

  async update(id: number, data: Prisma.UserUpdateInput): Promise<User>;

  async findByGithubId(githubId: number): Promise<User | null>;

  async findByUsername(username: string): Promise<User | null>;

  async count(): Promise<number>;
}
```

**Dependencies:**
- PrismaService

#### RepositoryRepository

**Responsibilities:**
- CRUD operations for Repository entity
- Find repositories by user
- Search repositories with filters
- Aggregate language statistics
- Aggregate temporal statistics
- Paginated queries

**Interfaces:**
```typescript
@Injectable()
export class RepositoryRepository {
  async create(data: Prisma.RepositoryCreateInput): Promise<Repository>;

  async update(id: number, data: Prisma.RepositoryUpdateInput): Promise<Repository>;

  async findByGithubId(githubId: number): Promise<Repository | null>;

  async findByUserId(
    userId: number,
    options: PaginationOptions
  ): Promise<PaginatedResult<Repository>>;

  async search(
    query: SearchQuery,
    options: PaginationOptions
  ): Promise<PaginatedResult<Repository>>;

  async aggregateByLanguage(userId?: number): Promise<LanguageAggregation[]>;

  async aggregateByMonth(userId?: number): Promise<MonthlyAggregation[]>;

  async count(userId?: number): Promise<number>;
}
```

**Dependencies:**
- PrismaService

#### LogRepository

**Responsibilities:**
- Insert log entries
- Delete logs older than specified date
- Query logs for monitoring purposes

**Interfaces:**
```typescript
@Injectable()
export class LogRepository {
  async create(data: Prisma.LogCreateInput): Promise<Log>;

  async deleteOlderThan(date: Date): Promise<number>;

  async findByDateRange(startDate: Date, endDate: Date): Promise<Log[]>;
}
```

**Dependencies:**
- PrismaService

### External Integration Layer

#### GitHubApiClient

**Responsibilities:**
- Wrap HTTP calls to GitHub API
- Handle authentication (if required)
- Implement retry logic with exponential backoff
- Respect GitHub rate limits
- Parse and transform GitHub API responses

**Interfaces:**
```typescript
@Injectable()
export class GitHubApiClient {
  async getUser(username: string): Promise<GitHubUser>;

  async getUserRepositories(username: string): Promise<GitHubRepository[]>;

  private async makeRequest<T>(url: string): Promise<T>;

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number
  ): Promise<T>;

  private handleRateLimitError(response: any): never;
}
```

**Dependencies:**
- HttpService
- ConfigService

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

// User entity representing GitHub users
model User {
  id              Int          @id @default(autoincrement())
  githubId        Int          @unique @map("github_id")
  login           String       @unique
  avatarUrl       String?      @map("avatar_url")
  name            String?
  bio             String?
  company         String?
  location        String?
  email           String?
  publicRepos     Int          @default(0) @map("public_repos")
  followers       Int          @default(0)
  following       Int          @default(0)
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  // Relationships
  repositories    Repository[]

  @@index([login])
  @@index([githubId])
  @@map("users")
}

// Repository entity representing GitHub repositories
model Repository {
  id              Int       @id @default(autoincrement())
  githubId        Int       @unique @map("github_id")
  name            String
  fullName        String    @map("full_name")
  description     String?
  url             String
  htmlUrl         String    @map("html_url")
  language        String?
  stargazersCount Int       @default(0) @map("stargazers_count")
  forksCount      Int       @default(0) @map("forks_count")
  openIssuesCount Int       @default(0) @map("open_issues_count")
  watchersCount   Int       @default(0) @map("watchers_count")
  size            Int       @default(0)
  defaultBranch   String    @default("main") @map("default_branch")
  isPrivate       Boolean   @default(false) @map("is_private")
  isFork          Boolean   @default(false) @map("is_fork")
  isArchived      Boolean   @default(false) @map("is_archived")
  githubCreatedAt DateTime  @map("github_created_at")
  githubUpdatedAt DateTime  @map("github_updated_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Foreign keys
  userId          Int       @map("user_id")

  // Relationships
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([name])
  @@index([language])
  @@index([githubCreatedAt])
  @@index([githubId])
  @@map("repositories")
}

// Log entity for centralized logging
model Log {
  id              Int       @id @default(autoincrement())
  timestamp       DateTime  @default(now())
  level           LogLevel
  message         String
  context         String?
  endpoint        String?
  method          String?
  statusCode      Int?      @map("status_code")
  requestId       String?   @map("request_id")
  stackTrace      String?   @map("stack_trace")
  metadata        Json?
  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([timestamp])
  @@index([level])
  @@index([endpoint])
  @@map("logs")
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}
```

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Repository : "owns"

    User {
        int id PK
        int githubId UK
        string login UK
        string avatarUrl
        string name
        string bio
        string company
        string location
        string email
        int publicRepos
        int followers
        int following
        datetime createdAt
        datetime updatedAt
    }

    Repository {
        int id PK
        int githubId UK
        string name
        string fullName
        string description
        string url
        string htmlUrl
        string language
        int stargazersCount
        int forksCount
        int openIssuesCount
        int watchersCount
        int size
        string defaultBranch
        boolean isPrivate
        boolean isFork
        boolean isArchived
        datetime githubCreatedAt
        datetime githubUpdatedAt
        datetime createdAt
        datetime updatedAt
        int userId FK
    }

    Log {
        int id PK
        datetime timestamp
        enum level
        string message
        string context
        string endpoint
        string method
        int statusCode
        string requestId
        string stackTrace
        json metadata
        datetime createdAt
    }
```

### Data Transfer Objects

#### Request DTOs

```typescript
// Validation decorators from class-validator
export class UsernameParamDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9-]+$/)
  username: string;
}

export class PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 10;
}

export class SearchQueryDto extends PaginationQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  keywords: string;
}

export class StatisticsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9-]+$/)
  user?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  topN?: number = 5;
}
```

#### Response DTOs

```typescript
export class SyncResponseDto {
  message: string;
  repositoriesSynced: number;
  timestamp: string;
}

export class RepositoryDto {
  id: number;
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  createdAt: string;
}

export class PaginationMetaDto {
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export class PaginatedRepositoryResponseDto {
  data: RepositoryDto[];
  meta: PaginationMetaDto;
}

export class StatisticsSummaryDto {
  total_repos: number;
  total_users?: number;
}

export class LanguageStatDto {
  language: string;
  count: number;
}

export class UserRankingDto {
  username: string;
  repositoryCount: number;
}

export class StatisticsResponseDto {
  summary: StatisticsSummaryDto;
  languages: LanguageStatDto[];
  top_users_by_repos?: UserRankingDto[];
  timeline_created_monthly: Record<string, number>;
}
```

## Business Process

### Process 1: Repository Synchronization

This process handles synchronizing GitHub user and repository data to the local database.

```mermaid
flowchart TD
    A[Client POST /sync/:username] --> B[SyncController receives request]
    B --> C[Validate UsernameParamDto]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[SyncService.syncUserRepositories]

    F --> G[GitHubApiClient.getUser]
    G --> H{User Found?}
    H -->|No| I[Return 404 User Not Found]
    H -->|Yes| J[GitHubApiClient.getUserRepositories]

    J --> K{Repositories Retrieved?}
    K -->|GitHub API Error| L[Return 502 Bad Gateway]
    K -->|Rate Limit| M[Return 429 Rate Limit]
    K -->|Success| N[UserRepository.findByGithubId]

    N --> O{User Exists?}
    O -->|Yes| P[UserRepository.update]
    O -->|No| Q[UserRepository.create]

    P --> R[Loop through repositories]
    Q --> R

    R --> S[RepositoryRepository.findByGithubId]
    S --> T{Repository Exists?}
    T -->|Yes| U[RepositoryRepository.update]
    T -->|No| V[RepositoryRepository.create]

    U --> W{More Repositories?}
    V --> W
    W -->|Yes| R
    W -->|No| X[Build SyncResponseDto]

    X --> Y[LoggingService.logRequest async]
    Y --> Z[Return 200 with sync result]
```

### Process 2: Repository Listing with Pagination

This process retrieves repositories for a specific user with pagination support.

```mermaid
flowchart TD
    A[Client GET /repositories/user/:username] --> B[RepositoryController receives request]
    B --> C[Validate UsernameParamDto and PaginationQueryDto]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[RepositoryService.listByUsername]

    F --> G[UserRepository.findByUsername]
    G --> H{User Found?}
    H -->|No| I[Return empty array with meta]
    H -->|Yes| J[RepositoryRepository.findByUserId]

    J --> K[Build Prisma query with pagination]
    K --> L[Apply orderBy githubCreatedAt desc]
    L --> M[Execute query with skip and take]

    M --> N[Count total repositories]
    N --> O[Calculate pagination metadata]
    O --> P[Transform entities to RepositoryDto]

    P --> Q[Build PaginatedRepositoryResponseDto]
    Q --> R[LoggingService.logRequest async]
    R --> S[Return 200 with paginated results]
```

### Process 3: Repository Search

This process searches repositories by keywords across multiple fields.

```mermaid
flowchart TD
    A[Client GET /repositories/search] --> B[RepositoryController receives request]
    B --> C[Validate SearchQueryDto]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[RepositoryService.searchRepositories]

    F --> G[Sanitize and escape keywords]
    G --> H[Split keywords by whitespace]
    H --> I[Build Prisma OR query]

    I --> J[Add name contains filter]
    J --> K[Add description contains filter]
    K --> L[Add language equals filter]

    L --> M[Apply case-insensitive mode]
    M --> N[RepositoryRepository.search with filters]

    N --> O[Execute query with pagination]
    O --> P[Count matching repositories]
    P --> Q[Apply relevance ranking]

    Q --> R[Sort by exact matches first]
    R --> S[Secondary sort by githubCreatedAt]
    S --> T[Transform to RepositoryDto]

    T --> U[Build PaginatedRepositoryResponseDto]
    U --> V[LoggingService.logRequest async]
    V --> W[Return 200 with search results]
```

### Process 4: Statistics Generation

This process calculates and returns statistical insights from repository data.

```mermaid
flowchart TD
    A[Client GET /statistics] --> B[StatisticsController receives request]
    B --> C[Validate StatisticsQueryDto]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F{User parameter provided?}

    F -->|No| G[StatisticsService.getGlobalStatistics]
    F -->|Yes| H[StatisticsService.getUserStatistics]

    G --> I[Calculate summary: total_repos and total_users]
    H --> J[Find user by username]
    J --> K{User exists?}
    K -->|No| L[Return zero statistics]
    K -->|Yes| M[Calculate summary: total_repos]

    I --> N[RepositoryRepository.aggregateByLanguage]
    M --> N

    N --> O[Order languages by count desc]
    O --> P{Global statistics?}
    P -->|Yes| Q[RepositoryRepository aggregate user repo counts]
    P -->|No| R[RepositoryRepository.aggregateByMonth]

    Q --> S[Order users by repository count]
    S --> T[Limit to topN users]
    T --> R

    R --> U[Group repositories by year-month]
    U --> V[Fill timeline gaps with zero counts]
    V --> W[Format as YYYY-MM keys]

    W --> X[Build StatisticsResponseDto]
    X --> Y[LoggingService.logRequest async]
    Y --> Z[Return 200 with statistics]
```

### Process 5: Asynchronous Database Logging

This process handles logging API requests and errors to the database asynchronously.

```mermaid
flowchart TD
    A[API Request Received] --> B[Request Processing]
    B --> C[Business Logic Execution]
    C --> D[Response Generated]

    D --> E[LoggingService.logRequest called]
    E --> F[Create log entry object]
    F --> G[Push to in-memory log queue]
    G --> H[Return immediately without blocking]

    H --> I[Response sent to client]

    J[Background Process Every 5 seconds] --> K[Check log queue]
    K --> L{Queue has entries?}
    L -->|No| J
    L -->|Yes| M[Batch dequeue log entries]

    M --> N[LogRepository.create bulk insert]
    N --> O[Clear processed entries from queue]
    O --> J

    P[Scheduled Job Daily at 2 AM] --> Q[Calculate retention date]
    Q --> R[Current date minus 30 days]
    R --> S[LogRepository.deleteOlderThan]
    S --> T[Delete old log records]
    T --> U[Log deletion count]
```

## Error Handling Strategy

### Error Classification

The system implements a structured error handling approach with the following error categories:

1. **Validation Errors (400 Bad Request)**
   - Invalid input parameters
   - Missing required fields
   - Constraint violations

2. **Not Found Errors (404 Not Found)**
   - GitHub user does not exist
   - Resource not found in local database

3. **Rate Limit Errors (429 Too Many Requests)**
   - GitHub API rate limit exceeded
   - Application rate limit exceeded

4. **External Service Errors (502 Bad Gateway)**
   - GitHub API unavailable
   - GitHub API timeout
   - GitHub API unexpected response

5. **Server Errors (500 Internal Server Error)**
   - Database connection failures
   - Unexpected application errors
   - Unhandled exceptions

### Error Response Format

All error responses follow a consistent structure:

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}
```

### Exception Filters

Implement global exception filters in NestJS:

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: this.getErrorMessage(exception),
      error: this.getErrorName(exception),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log error without exposing sensitive data
    this.loggingService.logError(exception, {
      url: request.url,
      method: request.method,
    });

    response.status(status).json(errorResponse);
  }
}
```

### Retry Logic

For external API calls to GitHub, implement exponential backoff retry:

```typescript
async retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      await this.sleep(delay);
    }
  }
}
```

### Database Transaction Handling

Use Prisma transactions for data consistency:

```typescript
async syncUserRepositories(username: string): Promise<SyncResult> {
  return await this.prisma.$transaction(async (tx) => {
    // Upsert user
    const user = await tx.user.upsert({...});

    // Upsert repositories
    for (const repo of repositories) {
      await tx.repository.upsert({...});
    }

    return { repositoriesSynced: repositories.length };
  });
}
```

### Input Sanitization

All user inputs are validated and sanitized using class-validator decorators:

- Prevent SQL injection through Prisma parameterized queries
- Escape special characters in search keywords
- Validate regex patterns for usernames
- Limit string lengths to prevent buffer overflow
- Type coercion for numeric parameters

## Testing Strategy

### Test Pyramid

The testing strategy follows the test pyramid principle with emphasis on:

1. **Unit Tests (60% of coverage)**: Fast, isolated tests for services and utilities
2. **Integration Tests (30% of coverage)**: Tests for API endpoints with database
3. **End-to-End Tests (10% of coverage)**: Full request/response cycle tests

### Unit Testing

**Target:** Service layer business logic

**Tools:**
- Jest as test runner
- ts-jest for TypeScript support
- Mock dependencies using Jest mocks

**Example:**
```typescript
describe('StatisticsService', () => {
  let service: StatisticsService;
  let repositoryRepository: jest.Mocked<RepositoryRepository>;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    repositoryRepository = createMock<RepositoryRepository>();
    userRepository = createMock<UserRepository>();
    service = new StatisticsService(repositoryRepository, userRepository);
  });

  describe('getGlobalStatistics', () => {
    it('should calculate global statistics correctly', async () => {
      repositoryRepository.count.mockResolvedValue(100);
      userRepository.count.mockResolvedValue(10);

      const result = await service.getGlobalStatistics(5);

      expect(result.summary.total_repos).toBe(100);
      expect(result.summary.total_users).toBe(10);
    });
  });
});
```

### Integration Testing

**Target:** API endpoints with database

**Tools:**
- Supertest for HTTP assertions
- TestContainers for PostgreSQL test database
- Prisma test client

**Example:**
```typescript
describe('RepositoryController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.repository.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('GET /repositories/user/:username', () => {
    it('should return repositories for existing user', async () => {
      // Seed test data
      const user = await prisma.user.create({...});
      await prisma.repository.create({...});

      return request(app.getHttpServer())
        .get('/repositories/user/testuser')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.meta.totalCount).toBe(1);
        });
    });
  });
});
```

### Mocking External APIs

GitHub API calls must be mocked to ensure tests run without network dependencies:

```typescript
const mockGitHubApiClient = {
  getUser: jest.fn().mockResolvedValue({
    id: 123,
    login: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
  }),
  getUserRepositories: jest.fn().mockResolvedValue([
    {
      id: 456,
      name: 'test-repo',
      description: 'Test repository',
      html_url: 'https://github.com/testuser/test-repo',
      language: 'TypeScript',
      created_at: '2025-01-01T00:00:00Z',
    },
  ]),
};
```

### Test Coverage Requirements

- Minimum 70% code coverage across all modules
- 100% coverage for critical business logic (sync, statistics calculations)
- Coverage report generated using Jest's built-in coverage tool
- CI/CD pipeline fails if coverage drops below threshold

**Configuration in package.json:**
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

### Performance Testing

While not required for initial implementation, performance tests should verify:

- Listing endpoint responds within 2 seconds for 1,000 repositories
- Search endpoint responds within 3 seconds for 10,000 repositories
- Statistics endpoint responds within 5 seconds for 100,000 repositories
- System handles 100 concurrent requests without significant degradation

**Tool recommendation:** Artillery or k6 for load testing

## Security Architecture

### Rate Limiting

**Implementation:** @nestjs/throttler package

**Configuration:**
- Global rate limit: 100 requests per minute per IP
- Synchronization endpoint: 10 requests per minute per IP
- Configurable via environment variables

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
})
export class AppModule {}
```

### CORS Configuration

**Allowed Origins:**
- Localhost development: http://localhost:3000, http://localhost:5173
- Configurable production origins via environment variable
- Credentials support disabled by default
- Exposed headers: Content-Range, X-Content-Range

```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST'],
  credentials: false,
});
```

### Input Validation

**Strategy:** Class-validator decorators on all DTOs

**Security measures:**
- Whitelist unknown properties
- Transform types automatically
- Validate nested objects
- Sanitize strings

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: false,
    },
  }),
);
```

### Helmet Security Headers

**Implementation:** Helmet middleware for secure HTTP headers

```typescript
import helmet from '@fastify/helmet';

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
  },
}));
```

### Environment Variables Security

**Sensitive configuration:**
- DATABASE_URL: PostgreSQL connection string
- GITHUB_TOKEN: GitHub API token (optional, for higher rate limits)
- LOG_RETENTION_DAYS: Log retention period (default 30)

**Storage:** Environment variables via .env file (never committed)

**Validation:** ConfigModule validates required variables on startup

## Infrastructure Architecture

### Docker Container Architecture

```mermaid
graph TB
    subgraph Docker Host
        subgraph Network[docker-network]
            API[NestJS API Container<br/>Port 3000]
            DB[(PostgreSQL Container<br/>Port 5432)]
        end

        Volume1[DB Volume<br/>postgres-data]
        Volume2[Logs Volume<br/>app-logs]
    end

    Client[External Client] -->|Port 3000| API
    API -->|Port 5432| DB
    DB ---|Persist Data| Volume1
    API ---|Write Logs| Volume2

    style API fill:#4CAF50,stroke:#000,stroke-width:2px,color:#fff
    style DB fill:#4169E1,stroke:#000,stroke-width:2px,color:#fff
    style Volume1 fill:#FF9800,stroke:#000,stroke-width:2px
    style Volume2 fill:#FF9800,stroke:#000,stroke-width:2px
```

### Multi-Stage Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: github-api-postgres
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-github_api}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: github-api-app
    environment:
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@postgres:5432/${DB_NAME:-github_api}
      PORT: 3000
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && node dist/main"

volumes:
  postgres-data:
```

### Database Migration Strategy

**Prisma Migrations:**
- Development: `npx prisma migrate dev`
- Production: `npx prisma migrate deploy` (runs automatically on container start)

**Migration workflow:**
1. Schema changes made in schema.prisma
2. Generate migration: `npx prisma migrate dev --name <migration-name>`
3. Migration SQL files versioned in git
4. Deployed automatically in Docker container startup

### Health Check Endpoints

```typescript
@Controller('health')
export class HealthController {
  @Get()
  async check(): Promise<HealthCheckResult> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: await this.checkDatabase(),
      github: await this.checkGitHub(),
    };
  }
}
```

## Documentation Architecture

### OpenAPI/Swagger Documentation

**URL:** http://localhost:3000/api/docs

**Configuration:**
```typescript
const config = new DocumentBuilder()
  .setTitle('GitHub Repository Management API')
  .setDescription('API for synchronizing, searching, and analyzing GitHub repository data')
  .setVersion('1.0')
  .addTag('sync', 'Repository synchronization operations')
  .addTag('repositories', 'Repository listing and search operations')
  .addTag('statistics', 'Statistical analysis operations')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

**Features:**
- Interactive API testing interface
- Request/response examples
- Schema definitions
- Authentication requirements (if applicable)

### VitePress Documentation

**Structure:**
```
docs/
├── .vitepress/
│   └── config.ts
├── index.md (Landing page)
├── guide/
│   ├── getting-started.md
│   ├── installation.md
│   ├── configuration.md
│   └── deployment.md
├── api/
│   ├── overview.md
│   ├── sync.md
│   ├── repositories.md
│   └── statistics.md
├── architecture/
│   ├── overview.md
│   ├── components.md
│   └── database.md
└── development/
    ├── contributing.md
    ├── testing.md
    └── troubleshooting.md
```

**Commands:**
- Development: `npm run docs:dev` (runs on http://localhost:5173)
- Build: `npm run docs:build` (outputs to docs/.vitepress/dist)

### README.md Content

**Sections:**
1. Project overview and features
2. Technology stack (Node.js, NestJS, PostgreSQL, Prisma, Docker)
3. Prerequisites (Docker Desktop, Node.js 20+)
4. Quick start with Docker Compose
5. Environment variables configuration
6. API endpoints summary table
7. Development setup without Docker
8. Testing commands
9. Project structure overview
10. License information

## Performance Optimization

### Database Indexing Strategy

**Indexed Fields:**
- User: `login`, `githubId`
- Repository: `userId`, `name`, `language`, `githubCreatedAt`, `githubId`
- Log: `timestamp`, `level`, `endpoint`

**Composite Indexes:**
- Repository: Consider composite index on `(userId, githubCreatedAt)` for user listing queries
- Log: Consider composite index on `(timestamp, level)` for log queries

### Query Optimization

**Pagination:**
- Use cursor-based pagination for large datasets (future enhancement)
- Current offset-based pagination optimized with LIMIT and OFFSET
- Always include ORDER BY clause for consistent results

**Aggregations:**
- Use raw SQL for complex aggregations when Prisma ORM performance is insufficient
- Leverage PostgreSQL window functions for ranking queries
- Cache aggregation results for statistics endpoint (future enhancement with Redis)

### Connection Pooling

**Prisma Configuration:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
}
```

**Environment Configuration:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname?connection_limit=10&pool_timeout=60
```

### Asynchronous Processing

**Log Queue:**
- In-memory queue for log entries
- Batch processing every 5 seconds
- Bulk insert to reduce database round trips

**GitHub API Calls:**
- Parallel requests for multiple repositories (future enhancement)
- Batch processing for users with >100 repositories
- Respect rate limits with circuit breaker pattern

## Monitoring and Observability

### Structured Logging

**Log Format (JSON):**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Repository synchronization completed",
  "context": "SyncService",
  "requestId": "abc-123-def",
  "metadata": {
    "username": "octocat",
    "repositoriesSynced": 42,
    "duration": 1234
  }
}
```

**Log Levels:**
- DEBUG: Detailed diagnostic information
- INFO: General informational messages
- WARN: Warning messages for non-critical issues
- ERROR: Error messages with stack traces

### Database Log Querying

**Log Retention:**
- Automatic deletion of logs older than 30 days
- Configurable via `LOG_RETENTION_DAYS` environment variable
- Scheduled job runs daily at 2:00 AM

**Log Analysis Queries:**
```sql
-- Error rate by endpoint
SELECT endpoint, COUNT(*) as error_count
FROM logs
WHERE level = 'ERROR' AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY error_count DESC;

-- Response time distribution
SELECT
  endpoint,
  AVG((metadata->>'duration')::int) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration')::int) as p95_duration_ms
FROM logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

### Metrics (Future Enhancement)

Consider adding Prometheus metrics:
- Request count by endpoint
- Request duration histogram
- GitHub API call count and duration
- Database query duration
- Active database connections

## Deployment Considerations

### Environment Variables

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: API server port (default 3000)
- `NODE_ENV`: Environment (development, production)

**Optional:**
- `GITHUB_TOKEN`: GitHub personal access token for higher rate limits
- `RATE_LIMIT_TTL`: Rate limit time window in milliseconds (default 60000)
- `RATE_LIMIT_MAX`: Maximum requests per time window (default 100)
- `LOG_RETENTION_DAYS`: Log retention period (default 30)
- `ALLOWED_ORIGINS`: Comma-separated CORS origins

### Production Deployment Checklist

1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Set strong database password
4. Enable HTTPS (reverse proxy like Nginx)
5. Configure log aggregation (CloudWatch, Datadog, etc.)
6. Set up monitoring and alerting
7. Configure database backups
8. Set resource limits in docker-compose.yml
9. Enable Docker health checks
10. Document incident response procedures

### Scaling Considerations

**Horizontal Scaling:**
- Stateless API design allows multiple instances
- Use load balancer (Nginx, AWS ALB) for distribution
- Shared PostgreSQL database

**Database Scaling:**
- Read replicas for statistics and search queries
- Connection pooling with PgBouncer
- Vertical scaling of PostgreSQL instance

**Caching Layer (Future):**
- Redis for statistics caching
- Cache invalidation on synchronization
- Reduce database load for frequently accessed data

## Appendix

### Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 20.x | JavaScript runtime |
| Language | TypeScript | 5.x | Type-safe development |
| Framework | NestJS | 10.x | Application framework |
| ORM | Prisma | 5.x | Database access |
| Database | PostgreSQL | 16.x | Data persistence |
| Containerization | Docker | 24.x | Application packaging |
| Orchestration | Docker Compose | 2.x | Multi-container management |
| Testing | Jest | 29.x | Test framework |
| Validation | class-validator | 0.14.x | DTO validation |
| Documentation | Swagger | 7.x | API documentation |
| Documentation | VitePress | 1.x | Static site generation |

### API Endpoints Summary

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/sync/:username` | POST | Synchronize user repositories | Variable (GitHub API dependent) |
| `/repositories/user/:username` | GET | List user repositories | <2s for 1,000 repos |
| `/repositories/search` | GET | Search repositories | <3s for 10,000 repos |
| `/statistics` | GET | Get statistics | <5s for 100,000 repos |
| `/health` | GET | Health check | <100ms |
| `/api/docs` | GET | Swagger documentation | <100ms |

### Development Commands

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development server
npm run start:dev

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e

# Build application
npm run build

# Start production server
npm run start:prod

# Run linter
npm run lint

# Format code
npm run format

# Start documentation site
npm run docs:dev

# Build documentation
npm run docs:build
```

### Docker Commands

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop containers
docker-compose down

# Rebuild containers
docker-compose up -d --build

# Access database shell
docker-compose exec postgres psql -U postgres -d github_api

# View database logs
docker-compose logs -f postgres
```

### External Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Docker Documentation](https://docs.docker.com/)
- [VitePress Documentation](https://vitepress.dev/)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
**Status:** Draft - Pending Approval
