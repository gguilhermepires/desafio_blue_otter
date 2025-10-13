# Design Document: GitHub Repository Management API

## Overview

### Design Goal
Design a scalable, secure, and maintainable RESTful API that enables synchronization, querying, and statistical analysis of GitHub repository data. The system acts as an intermediary layer between GitHub's public API and client applications, providing enhanced search capabilities, persistent data storage, and aggregated analytics.

### Scope
This design covers:
- **Core functionality**: 4 REST API endpoints for repository synchronization, listing, search, and statistics
- **Technology stack**: NestJS with TypeScript, PostgreSQL with Prisma ORM
- **Infrastructure**: Docker containerization with Docker Compose orchestration
- **Cross-cutting concerns**: Logging, rate limiting, CORS, security, error handling, and testing
- **Documentation**: OpenAPI/Swagger, README.md, and VitePress static site

### Out of Scope
- Authentication and authorization (initial version uses public GitHub API)
- Real-time repository monitoring or webhooks
- GitHub Enterprise integration
- Repository content analysis beyond metadata

---

## Architecture Design

### System Architecture Diagram

```mermaid
graph TB
    Client[Client Application] --> API[NestJS API Gateway]
    API --> RateLimit[Rate Limiter]
    RateLimit --> Controllers[Controllers Layer]
    Controllers --> Services[Services Layer]
    Services --> GitHub[GitHub API Client]
    Services --> Repositories[Repositories Layer]
    Repositories --> Prisma[Prisma ORM]
    Prisma --> DB[(PostgreSQL Database)]
    Services --> Logger[Winston Logger]
    Logger --> LogQueue[Async Log Queue]
    LogQueue --> DB
    API --> Swagger[Swagger/OpenAPI]
```

### Data Flow Diagram

#### Synchronization Flow
```mermaid
graph LR
    A[POST /sync request] --> B[Validate username]
    B --> C[Fetch from GitHub API]
    C --> D{User exists?}
    D -->|No| E[Return 404]
    D -->|Yes| F[Transform data]
    F --> G[Upsert User record]
    G --> H[Upsert Repository records]
    H --> I[Log to database async]
    I --> J[Return sync summary]
```

#### Search Flow
```mermaid
graph LR
    A[GET /search request] --> B[Validate query params]
    B --> C[Build search query]
    C --> D[Execute database query]
    D --> E[Apply pagination]
    E --> F[Transform results]
    F --> G[Return paginated response]
```

#### Statistics Flow
```mermaid
graph LR
    A[GET /statistics request] --> B{User filter?}
    B -->|Global| C[Aggregate all data]
    B -->|User-specific| D[Aggregate user data]
    C --> E[Calculate metrics]
    D --> E
    E --> F[Format response]
    F --> G[Return statistics]
```

### Component Architecture

The application follows a layered architecture with clear separation of concerns:

**Layer 1: API Gateway**
- Express/Fastify server managed by NestJS
- CORS middleware
- Global rate limiting (Throttler)
- Exception filters
- Validation pipes

**Layer 2: Controllers**
- HTTP request handling
- DTO validation
- Response formatting
- OpenAPI decorators

**Layer 3: Services**
- Business logic implementation
- Data transformation
- External API orchestration
- Transaction management

**Layer 4: Repositories**
- Data access abstraction
- Prisma query builders
- Database transactions

**Layer 5: Infrastructure**
- Prisma ORM client
- Winston logger with custom transports
- HTTP client for GitHub API

---

## Component Design

### 1. RepositorySyncController

**Responsibilities:**
- Handle POST /api/sync/:username requests
- Validate username format
- Delegate synchronization to service layer
- Return synchronization summary

**Interfaces:**
```typescript
@Controller('api/sync')
export class RepositorySyncController {
  constructor(private readonly syncService: RepositorySyncService) {}

  @Post(':username')
  @HttpCode(200)
  @ApiOperation({ summary: 'Synchronize GitHub user repositories' })
  @ApiParam({ name: 'username', description: 'GitHub username' })
  @ApiResponse({ status: 200, type: SyncResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 502, description: 'GitHub API error' })
  async syncRepositories(
    @Param('username') username: string
  ): Promise<SyncResponseDto>;
}
```

**Dependencies:**
- RepositorySyncService
- Logger

---

### 2. RepositoryListController

**Responsibilities:**
- Handle GET /api/repositories requests
- Validate query parameters (username, page, pageSize)
- Return paginated repository list

**Interfaces:**
```typescript
@Controller('api/repositories')
export class RepositoryListController {
  constructor(private readonly listService: RepositoryListService) {}

  @Get()
  @ApiOperation({ summary: 'List repositories for a user' })
  @ApiQuery({ name: 'username', required: true, description: 'GitHub username' })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, default: 20 })
  @ApiResponse({ status: 200, type: RepositoryListResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async listRepositories(
    @Query() query: RepositoryListQueryDto
  ): Promise<RepositoryListResponseDto>;
}
```

**Dependencies:**
- RepositoryListService
- Logger

---

### 3. RepositorySearchController

**Responsibilities:**
- Handle GET /api/search requests
- Validate search keywords and pagination parameters
- Return paginated search results ordered by relevance

**Interfaces:**
```typescript
@Controller('api/search')
export class RepositorySearchController {
  constructor(private readonly searchService: RepositorySearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search repositories by keywords' })
  @ApiQuery({ name: 'q', required: true, description: 'Search keywords' })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, default: 20 })
  @ApiResponse({ status: 200, type: SearchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid search query' })
  async searchRepositories(
    @Query() query: SearchQueryDto
  ): Promise<SearchResponseDto>;
}
```

**Dependencies:**
- RepositorySearchService
- Logger

---

### 4. StatisticsController

**Responsibilities:**
- Handle GET /api/statistics requests
- Validate optional user filter and topN parameter
- Return statistical aggregations

**Interfaces:**
```typescript
@Controller('api/statistics')
export class StatisticsController {
  constructor(private readonly statsService: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get repository statistics' })
  @ApiQuery({ name: 'user', required: false, description: 'Filter by username' })
  @ApiQuery({ name: 'topN', required: false, type: Number, default: 5, maximum: 20 })
  @ApiResponse({ status: 200, type: StatisticsResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getStatistics(
    @Query() query: StatisticsQueryDto
  ): Promise<StatisticsResponseDto>;
}
```

**Dependencies:**
- StatisticsService
- Logger

---

### 5. RepositorySyncService

**Responsibilities:**
- Orchestrate synchronization process
- Fetch user data from GitHub API
- Fetch repositories from GitHub API (with pagination)
- Transform GitHub data to domain models
- Coordinate upsert operations via repositories
- Handle GitHub API errors and rate limits

**Interfaces:**
```typescript
@Injectable()
export class RepositorySyncService {
  constructor(
    private readonly githubClient: GitHubApiClient,
    private readonly userRepository: UserRepository,
    private readonly repositoryRepository: RepositoryRepository,
    private readonly logger: Logger
  ) {}

  async syncUserRepositories(username: string): Promise<SyncResult>;
  private async fetchUserData(username: string): Promise<GitHubUser>;
  private async fetchRepositories(username: string): Promise<GitHubRepository[]>;
  private transformUserData(githubUser: GitHubUser): UserEntity;
  private transformRepositoryData(githubRepo: GitHubRepository): RepositoryEntity;
}
```

**Dependencies:**
- GitHubApiClient
- UserRepository
- RepositoryRepository
- Logger

---

### 6. RepositoryListService

**Responsibilities:**
- Query repositories by username with pagination
- Apply sorting (creation date descending)
- Calculate pagination metadata
- Transform database entities to DTOs

**Interfaces:**
```typescript
@Injectable()
export class RepositoryListService {
  constructor(
    private readonly repositoryRepository: RepositoryRepository,
    private readonly logger: Logger
  ) {}

  async listRepositoriesByUser(
    username: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedRepositoryList>;
}
```

**Dependencies:**
- RepositoryRepository
- Logger

---

### 7. RepositorySearchService

**Responsibilities:**
- Build search queries with case-insensitive partial matching
- Search across name, description, and language fields
- Support multi-keyword OR logic
- Apply relevance-based sorting (exact match priority, then creation date)
- Implement pagination

**Interfaces:**
```typescript
@Injectable()
export class RepositorySearchService {
  constructor(
    private readonly repositoryRepository: RepositoryRepository,
    private readonly logger: Logger
  ) {}

  async searchRepositories(
    keywords: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedRepositoryList>;

  private buildSearchConditions(keywords: string): Prisma.RepositoryWhereInput;
  private calculateRelevanceScore(repo: Repository, keywords: string): number;
}
```

**Dependencies:**
- RepositoryRepository
- Logger

---

### 8. StatisticsService

**Responsibilities:**
- Calculate global or user-specific statistics
- Aggregate repository counts
- Group repositories by language
- Rank users by repository count
- Generate monthly creation timeline histogram
- Enforce topN limits (1-20)

**Interfaces:**
```typescript
@Injectable()
export class StatisticsService {
  constructor(
    private readonly repositoryRepository: RepositoryRepository,
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}

  async calculateStatistics(
    username?: string,
    topN?: number
  ): Promise<StatisticsResult>;

  private async calculateSummary(username?: string): Promise<SummaryStats>;
  private async calculateLanguageDistribution(username?: string): Promise<Record<string, number>>;
  private async calculateTopUsersByRepos(topN: number): Promise<UserRanking[]>;
  private async calculateMonthlyTimeline(username?: string): Promise<Record<string, number>>;
}
```

**Dependencies:**
- RepositoryRepository
- UserRepository
- Logger

---

### 9. GitHubApiClient

**Responsibilities:**
- Abstract HTTP calls to GitHub API
- Handle authentication (if tokens provided)
- Implement retry logic with exponential backoff
- Handle rate limit errors (429)
- Parse and transform GitHub responses
- Manage timeout configurations

**Interfaces:**
```typescript
@Injectable()
export class GitHubApiClient {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: Logger
  ) {}

  async getUserByUsername(username: string): Promise<GitHubUser>;
  async getRepositoriesForUser(username: string, page?: number): Promise<GitHubRepository[]>;

  private async request<T>(url: string, retries?: number): Promise<T>;
  private handleRateLimit(response: Response): void;
}
```

**Dependencies:**
- HttpService (Axios)
- ConfigService
- Logger

---

### 10. UserRepository

**Responsibilities:**
- Provide data access layer for User entity
- Implement upsert logic (create or update by GitHub user ID)
- Execute queries via Prisma

**Interfaces:**
```typescript
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertUser(userData: Prisma.UserCreateInput): Promise<User>;
  async findUserByLogin(login: string): Promise<User | null>;
  async findUserById(id: number): Promise<User | null>;
  async getUserWithRepositoryCount(): Promise<Array<{ user: User; repoCount: number }>>;
}
```

**Dependencies:**
- PrismaService

---

### 11. RepositoryRepository

**Responsibilities:**
- Provide data access layer for Repository entity
- Implement upsert logic (create or update by GitHub repository ID)
- Support complex search queries with multiple conditions
- Support pagination and sorting
- Calculate aggregations for statistics

**Interfaces:**
```typescript
@Injectable()
export class RepositoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertRepository(repoData: Prisma.RepositoryCreateInput): Promise<Repository>;
  async findRepositoriesByUser(
    userId: number,
    page: number,
    pageSize: number
  ): Promise<{ data: Repository[]; total: number }>;

  async searchRepositories(
    conditions: Prisma.RepositoryWhereInput,
    page: number,
    pageSize: number
  ): Promise<{ data: Repository[]; total: number }>;

  async countRepositories(userId?: number): Promise<number>;
  async groupByLanguage(userId?: number): Promise<Record<string, number>>;
  async groupByMonth(userId?: number): Promise<Record<string, number>>;
}
```

**Dependencies:**
- PrismaService

---

### 12. DatabaseLoggerTransport (Winston Custom Transport)

**Responsibilities:**
- Implement custom Winston transport for database logging
- Queue log messages asynchronously
- Batch write logs to database via Prisma
- Handle transport errors gracefully

**Interfaces:**
```typescript
export class DatabaseLoggerTransport extends Transport {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batchSize: number = 10,
    private readonly flushInterval: number = 5000
  ) {
    super();
  }

  log(info: LogInfo, callback: () => void): void;
  private async flushLogs(): Promise<void>;
}
```

**Dependencies:**
- PrismaService

---

### 13. LogCleanupService

**Responsibilities:**
- Scheduled task to delete logs older than retention period
- Run daily via cron job
- Configurable retention period (default 30 days)

**Interfaces:**
```typescript
@Injectable()
export class LogCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: Logger
  ) {}

  @Cron('0 2 * * *') // Run daily at 2 AM
  async cleanupOldLogs(): Promise<void>;
}
```

**Dependencies:**
- PrismaService
- ConfigService
- Logger

---

## Data Model

### Prisma Schema

```prisma
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
  description     String?   @db.Text
  url             String
  language        String?
  createdAtGithub DateTime  @map("created_at_github")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  userId          Int       @map("user_id")
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([name])
  @@index([language])
  @@index([createdAtGithub])
  @@index([userId, createdAtGithub])
  @@map("repositories")
}

model Log {
  id          Int       @id @default(autoincrement())
  level       String    @db.VarChar(10)
  message     String    @db.Text
  context     String?   @db.VarChar(255)
  endpoint    String?   @db.VarChar(255)
  method      String?   @db.VarChar(10)
  statusCode  Int?      @map("status_code")
  requestId   String?   @map("request_id") @db.VarChar(100)
  stackTrace  String?   @map("stack_trace") @db.Text
  metadata    Json?
  timestamp   DateTime  @default(now())

  @@index([level])
  @@index([timestamp])
  @@index([endpoint])
  @@map("logs")
}
```

### Data Model Diagram

```mermaid
erDiagram
    User ||--o{ Repository : "owns"

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
        text description
        string url
        string language
        datetime createdAtGithub
        datetime createdAt
        datetime updatedAt
        int userId FK
    }

    Log {
        int id PK
        string level
        text message
        string context
        string endpoint
        string method
        int statusCode
        string requestId
        text stackTrace
        json metadata
        datetime timestamp
    }
```

### Key Design Decisions

1. **Separate User and Repository tables**: One-to-many relationship allows efficient querying and prevents data duplication
2. **GitHub IDs as unique constraints**: Ensures idempotency for synchronization operations
3. **Indexed fields**: Strategic indexes on frequently queried fields (userId, name, language, createdAtGithub) for performance
4. **Cascade deletion**: When a user is deleted, all associated repositories are automatically removed
5. **Nullable description and language**: GitHub repositories may not have these fields
6. **Separate timestamp fields**: Track both GitHub creation time and local database record times
7. **Log table independence**: Logs are not relationally linked to other entities for flexibility and performance

---

## Business Process

### Process 1: Repository Synchronization

```mermaid
flowchart TD
    A[Client sends POST /api/sync/:username] --> B[RepositorySyncController.syncRepositories]
    B --> C[Validate username format]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[RepositorySyncService.syncUserRepositories]
    F --> G[GitHubApiClient.getUserByUsername]
    G --> H{User exists?}
    H -->|No| I[Return 404 Not Found]
    H -->|Yes| J[Transform GitHub user data]
    J --> K[UserRepository.upsertUser]
    K --> L[GitHubApiClient.getRepositoriesForUser]
    L --> M{Rate limit exceeded?}
    M -->|Yes| N[Return 429 Rate Limit]
    M -->|No| O[Loop through repositories]
    O --> P[Transform repository data]
    P --> Q[RepositoryRepository.upsertRepository]
    Q --> R{More repos?}
    R -->|Yes| O
    R -->|No| S[Logger.log sync complete]
    S --> T[Return 200 with summary]
```

### Process 2: Repository Listing

```mermaid
flowchart TD
    A[Client sends GET /api/repositories] --> B[RepositoryListController.listRepositories]
    B --> C[Validate query parameters]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[RepositoryListService.listRepositoriesByUser]
    F --> G[RepositoryRepository.findRepositoriesByUser]
    G --> H[Build Prisma query with filters]
    H --> I[Apply pagination skip and take]
    I --> J[Apply ordering by createdAtGithub DESC]
    J --> K[Execute query]
    K --> L[Calculate pagination metadata]
    L --> M[Transform entities to DTOs]
    M --> N[Return 200 with paginated response]
```

### Process 3: Repository Search

```mermaid
flowchart TD
    A[Client sends GET /api/search] --> B[RepositorySearchController.searchRepositories]
    B --> C[Validate query parameters]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[RepositorySearchService.searchRepositories]
    F --> G[Parse and sanitize keywords]
    G --> H[Build search conditions OR logic]
    H --> I[Build Prisma where clause]
    I --> J[RepositoryRepository.searchRepositories]
    J --> K[Execute case-insensitive ILIKE query]
    K --> L[Calculate relevance scores]
    L --> M[Sort by relevance then date]
    M --> N[Apply pagination]
    N --> O[Transform to DTOs]
    O --> P[Return 200 with paginated results]
```

### Process 4: Statistics Generation

```mermaid
flowchart TD
    A[Client sends GET /api/statistics] --> B[StatisticsController.getStatistics]
    B --> C[Validate query parameters]
    C --> D{Valid?}
    D -->|No| E[Return 400 Bad Request]
    D -->|Yes| F[StatisticsService.calculateStatistics]
    F --> G{User filter provided?}
    G -->|Yes| H[Filter by userId]
    G -->|No| I[Calculate global stats]
    H --> J[RepositoryRepository.countRepositories]
    I --> J
    J --> K[RepositoryRepository.groupByLanguage]
    K --> L[Sort languages by count DESC]
    L --> M{Global stats?}
    M -->|Yes| N[UserRepository.getUserWithRepositoryCount]
    N --> O[Sort and limit to topN users]
    M -->|No| P[Skip user ranking]
    O --> Q[RepositoryRepository.groupByMonth]
    P --> Q
    Q --> R[Format timeline as YYYY-MM keys]
    R --> S[Build response DTO]
    S --> T[Return 200 with statistics]
```

### Process 5: Asynchronous Database Logging

```mermaid
flowchart TD
    A[Application event logged] --> B[Winston Logger receives log]
    B --> C[DatabaseLoggerTransport.log]
    C --> D[Add to in-memory queue]
    D --> E{Queue size >= batchSize?}
    E -->|Yes| F[DatabaseLoggerTransport.flushLogs]
    E -->|No| G[Wait for flush interval]
    G --> H{Interval elapsed?}
    H -->|Yes| F
    H -->|No| G
    F --> I[Batch insert logs via Prisma]
    I --> J[Clear queue]
    J --> K[Log write complete]
```

### Process 6: Log Retention Cleanup

```mermaid
flowchart TD
    A[Cron job triggers daily at 2 AM] --> B[LogCleanupService.cleanupOldLogs]
    B --> C[Read retention period from config]
    C --> D[Calculate cutoff date]
    D --> E[Execute Prisma delete query]
    E --> F[WHERE timestamp < cutoff]
    F --> G[Log deletion count]
    G --> H[Cleanup complete]
```

---

## Error Handling Strategy

### Error Categories and Handling

#### 1. Validation Errors (400 Bad Request)
- **Cause**: Invalid input parameters, missing required fields
- **Handling**:
  - Use NestJS validation pipes with class-validator decorators on DTOs
  - Return structured error response with field-level validation messages
  - Example: `{ statusCode: 400, message: ['username must be a string'], error: 'Bad Request' }`

#### 2. Not Found Errors (404 Not Found)
- **Cause**: GitHub user does not exist, no repositories found
- **Handling**:
  - Catch GitHub API 404 responses in GitHubApiClient
  - Return descriptive error message
  - Example: `{ statusCode: 404, message: 'GitHub user not found', error: 'Not Found' }`

#### 3. Rate Limit Errors (429 Too Many Requests)
- **Cause**: Exceeded GitHub API rate limit or application rate limit
- **Handling**:
  - Detect GitHub rate limit headers (X-RateLimit-Remaining)
  - Use NestJS Throttler for application-level rate limiting
  - Return retry-after header with cooldown period
  - Example: `{ statusCode: 429, message: 'Rate limit exceeded. Try again in 60 seconds', error: 'Too Many Requests' }`

#### 4. External API Errors (502 Bad Gateway)
- **Cause**: GitHub API timeout, network failure, unexpected response
- **Handling**:
  - Implement retry logic with exponential backoff (max 3 retries)
  - Catch HTTP errors in GitHubApiClient
  - Log detailed error information including GitHub response
  - Return generic error to client
  - Example: `{ statusCode: 502, message: 'Failed to fetch data from GitHub', error: 'Bad Gateway' }`

#### 5. Database Errors (500 Internal Server Error)
- **Cause**: Prisma query failures, connection pool exhaustion, constraint violations
- **Handling**:
  - Catch Prisma exceptions in repositories
  - Log full error details and stack trace
  - Return sanitized error message to client (no sensitive data)
  - Use transactions for multi-step operations
  - Example: `{ statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' }`

#### 6. Timeout Errors (504 Gateway Timeout)
- **Cause**: Long-running database queries, slow GitHub API responses
- **Handling**:
  - Set HTTP client timeout (default 30 seconds)
  - Set database query timeout via Prisma
  - Return timeout error to client
  - Log performance metrics for investigation

### Global Exception Filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Database operation failed';
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception)
    );

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Retry Strategy for GitHub API

```typescript
private async retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (error.response?.status === 404) {
        throw error; // Don't retry not found
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

---

## Testing Strategy

### Testing Pyramid

```mermaid
graph TB
    A[E2E Tests - 10%] --> B[Integration Tests - 30%]
    B --> C[Unit Tests - 60%]
```

### 1. Unit Tests (Target: 70% coverage)

**Focus**: Individual service methods, utilities, transformations

**Tools**:
- Jest as test runner
- TypeScript support via ts-jest
- Mock dependencies using Jest mocks

**Coverage targets**:
- Services: 80% coverage
- Repositories: 70% coverage
- Utilities: 90% coverage
- DTOs/Models: 50% coverage (focus on complex validation logic)

**Example test cases**:
```typescript
describe('RepositorySyncService', () => {
  let service: RepositorySyncService;
  let githubClient: jest.Mocked<GitHubApiClient>;
  let userRepository: jest.Mocked<UserRepository>;
  let repositoryRepository: jest.Mocked<RepositoryRepository>;

  beforeEach(() => {
    githubClient = createMock<GitHubApiClient>();
    userRepository = createMock<UserRepository>();
    repositoryRepository = createMock<RepositoryRepository>();
    service = new RepositorySyncService(
      githubClient,
      userRepository,
      repositoryRepository,
      logger
    );
  });

  it('should sync user and repositories successfully', async () => {
    githubClient.getUserByUsername.mockResolvedValue(mockGitHubUser);
    githubClient.getRepositoriesForUser.mockResolvedValue(mockGitHubRepos);
    userRepository.upsertUser.mockResolvedValue(mockUser);
    repositoryRepository.upsertRepository.mockResolvedValue(mockRepo);

    const result = await service.syncUserRepositories('testuser');

    expect(result.reposSynced).toBe(2);
    expect(userRepository.upsertUser).toHaveBeenCalledTimes(1);
    expect(repositoryRepository.upsertRepository).toHaveBeenCalledTimes(2);
  });

  it('should throw NotFoundException when user not found', async () => {
    githubClient.getUserByUsername.mockRejectedValue(
      new NotFoundException('User not found')
    );

    await expect(
      service.syncUserRepositories('nonexistent')
    ).rejects.toThrow(NotFoundException);
  });
});
```

### 2. Integration Tests (Target: Key workflows)

**Focus**: Controller + Service + Repository integration, database interactions

**Tools**:
- Supertest for HTTP testing
- Testcontainers for PostgreSQL container
- Prisma test database seeding

**Example test cases**:
```typescript
describe('Repository Synchronization (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GitHubApiClient)
      .useValue(mockGitHubClient)
      .compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /api/sync/:username should create user and repositories', async () => {
    mockGitHubClient.getUserByUsername.mockResolvedValue(mockGitHubUser);
    mockGitHubClient.getRepositoriesForUser.mockResolvedValue(mockGitHubRepos);

    const response = await request(app.getHttpServer())
      .post('/api/sync/testuser')
      .expect(200);

    expect(response.body.reposSynced).toBe(2);

    const user = await prisma.user.findUnique({
      where: { login: 'testuser' },
      include: { repositories: true },
    });

    expect(user).toBeDefined();
    expect(user.repositories).toHaveLength(2);
  });
});
```

### 3. End-to-End Tests (Target: Critical user flows)

**Focus**: Full application workflows from HTTP request to database

**Tools**:
- Supertest
- Real PostgreSQL database (Docker container)
- Mock external GitHub API calls

**Example test cases**:
- Complete synchronization flow with upsert behavior
- Pagination across list and search endpoints
- Statistics calculation with various filters
- Rate limiting enforcement
- CORS preflight handling

### 4. Test Data Management

**Fixtures**:
- Create reusable mock data factories
- Use faker.js for generating realistic test data
- Separate fixtures for GitHub API responses and database entities

**Database seeding**:
```typescript
export async function seedTestData(prisma: PrismaService) {
  await prisma.user.createMany({
    data: [
      { githubId: 1, login: 'user1', avatarUrl: 'https://avatar1.png' },
      { githubId: 2, login: 'user2', avatarUrl: 'https://avatar2.png' },
    ],
  });

  await prisma.repository.createMany({
    data: [
      {
        githubId: 101,
        name: 'repo1',
        description: 'Test repository 1',
        url: 'https://github.com/user1/repo1',
        language: 'TypeScript',
        createdAtGithub: new Date('2024-01-01'),
        userId: 1,
      },
      // ... more test repositories
    ],
  });
}
```

### 5. Test Execution

**Commands**:
- `npm run test`: Run all unit tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:cov`: Run tests with coverage report
- `npm run test:e2e`: Run end-to-end tests
- `npm run test:integration`: Run integration tests

**CI/CD Integration**:
- Run tests in GitHub Actions on every PR
- Fail build if coverage drops below 70%
- Generate and upload coverage reports to Codecov

### 6. Performance Testing

**Focus**: Ensure performance requirements are met

**Test cases**:
- List endpoint: < 2 seconds for 1000 repositories
- Search endpoint: < 3 seconds for 10,000 repositories
- Statistics endpoint: < 5 seconds for 100,000 repositories
- Concurrent request handling: 100 simultaneous requests

**Tools**:
- Artillery or k6 for load testing
- Measure response times at P50, P95, P99 percentiles

---

## Security Architecture

### 1. Input Validation and Sanitization

**Implementation**:
- Use class-validator decorators on all DTOs
- Implement custom validators for complex rules
- Sanitize search keywords to prevent SQL injection
- Validate pagination parameters (min/max constraints)

**Example DTO**:
```typescript
export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message: 'Search query contains invalid characters',
  })
  q: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20;
}
```

### 2. Rate Limiting

**Strategy**:
- Application-level rate limiting using @nestjs/throttler
- IP-based throttling with X-Forwarded-For header support
- Different limits per endpoint

**Configuration**:
```typescript
ThrottlerModule.forRoot({
  ttl: 60, // Time window in seconds
  limit: 100, // Max requests per ttl
  ignoreUserAgents: [/health-check/], // Exclude health checks
}),
```

**Custom throttling per endpoint**:
```typescript
@Throttle(10, 60) // 10 requests per 60 seconds
@Post('sync/:username')
async syncRepositories() { ... }
```

### 3. CORS Configuration

**Implementation**:
```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = configService.get<string>('CORS_ORIGINS').split(',');

    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600,
});
```

**Environment configuration**:
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 4. Secure Headers

**Implementation using Helmet**:
```typescript
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

### 5. Sensitive Data Protection

**Strategies**:
- Store GitHub tokens in environment variables, never in code
- Exclude sensitive fields from logs and error responses
- Use Prisma field-level encryption for sensitive data (if needed)
- Sanitize stack traces in production error responses

### 6. Database Security

**Measures**:
- Use parameterized queries via Prisma (prevents SQL injection)
- Implement connection pooling with max connection limits
- Use database user with minimal required privileges
- Enable SSL for database connections in production

**Prisma configuration**:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname?schema=public&sslmode=require
```

---

## Deployment Architecture

### Docker Configuration

#### 1. Dockerfile (Multi-stage build)

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

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

#### 2. Docker Compose Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: github-api-db
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-github_repos}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "${DB_PORT:-5432}:5432"
    networks:
      - github-api-network
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
      NODE_ENV: ${NODE_ENV:-production}
      PORT: ${PORT:-3000}
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@postgres:5432/${DB_NAME:-github_repos}?schema=public
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3000}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      LOG_RETENTION_DAYS: ${LOG_RETENTION_DAYS:-30}
      GITHUB_TOKEN: ${GITHUB_TOKEN:-}
    ports:
      - "${PORT:-3000}:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - github-api-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:

networks:
  github-api-network:
    driver: bridge
```

### Environment Variables

**Required**:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Application port (default: 3000)
- `NODE_ENV`: Environment (development/production)

**Optional**:
- `GITHUB_TOKEN`: GitHub personal access token (increases rate limits)
- `CORS_ORIGINS`: Comma-separated allowed origins
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `LOG_RETENTION_DAYS`: Log retention period (default: 30)
- `THROTTLE_TTL`: Rate limit time window in seconds (default: 60)
- `THROTTLE_LIMIT`: Max requests per TTL (default: 100)

### Health Checks

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "github": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "github": { "status": "up" }
  }
}
```

**Implementation**:
```typescript
@Get('health')
@HealthCheck()
check() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.http.pingCheck('github', 'https://api.github.com'),
  ]);
}
```

---

## Documentation Strategy

### 1. OpenAPI/Swagger Documentation

**Configuration**:
```typescript
const config = new DocumentBuilder()
  .setTitle('GitHub Repository Management API')
  .setDescription('API for synchronizing and analyzing GitHub repository data')
  .setVersion('1.0')
  .addTag('sync', 'Repository synchronization')
  .addTag('repositories', 'Repository listing and search')
  .addTag('statistics', 'Statistical insights')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document, {
  swaggerOptions: {
    persistAuthorization: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
});
```

**Access**: `http://localhost:3000/api/docs`

### 2. README.md Structure

**Sections**:
1. Project Overview
2. Features
3. Technology Stack
4. Prerequisites
5. Installation & Setup
6. Running with Docker Compose
7. Environment Variables
8. API Endpoints Overview
9. Testing
10. Project Structure
11. Contributing
12. License

### 3. VitePress Documentation

**Structure**:
```
docs/
├── .vitepress/
│   └── config.ts
├── index.md
├── getting-started/
│   ├── installation.md
│   ├── configuration.md
│   └── quick-start.md
├── api/
│   ├── sync.md
│   ├── list.md
│   ├── search.md
│   └── statistics.md
├── architecture/
│   ├── overview.md
│   ├── database-schema.md
│   └── deployment.md
└── development/
    ├── testing.md
    └── contributing.md
```

**Scripts**:
```json
{
  "docs:dev": "vitepress dev docs",
  "docs:build": "vitepress build docs",
  "docs:preview": "vitepress preview docs"
}
```

---

## Performance Optimization

### 1. Database Query Optimization

**Strategies**:
- Strategic indexing on frequently queried fields
- Use Prisma's select to fetch only required fields
- Implement cursor-based pagination for large datasets
- Use database connection pooling

**Example optimized query**:
```typescript
async findRepositoriesByUser(userId: number, page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    this.prisma.repository.findMany({
      where: { userId },
      select: {
        id: true,
        githubId: true,
        name: true,
        description: true,
        url: true,
        language: true,
        createdAtGithub: true,
      },
      orderBy: { createdAtGithub: 'desc' },
      skip,
      take: pageSize,
    }),
    this.prisma.repository.count({ where: { userId } }),
  ]);

  return { data, total };
}
```

### 2. Caching Strategy

**Implementation**:
- Cache frequently accessed statistics using Redis (future enhancement)
- Implement HTTP caching headers for read-only endpoints
- Use Prisma query result caching for repeated queries

### 3. Async Processing

**Strategies**:
- Asynchronous log writing to database (non-blocking)
- Batch processing for large GitHub repository syncs
- Use background jobs for long-running tasks (future: Bull queue)

### 4. Response Compression

**Implementation**:
```typescript
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses > 1KB
}));
```

---

## Monitoring and Observability

### 1. Structured Logging

**Format**: JSON for machine readability

**Fields**:
- `timestamp`: ISO 8601 format
- `level`: debug/info/warn/error
- `message`: Human-readable message
- `context`: Module/service name
- `requestId`: Unique request identifier
- `metadata`: Additional context (userId, endpoint, duration)

**Example log entry**:
```json
{
  "timestamp": "2025-10-11T10:30:45.123Z",
  "level": "info",
  "message": "Repository sync completed",
  "context": "RepositorySyncService",
  "requestId": "req-abc123",
  "metadata": {
    "username": "testuser",
    "reposSynced": 15,
    "duration": 2341
  }
}
```

### 2. Metrics Collection

**Key metrics** (future enhancement with Prometheus):
- Request count per endpoint
- Response time distribution (P50, P95, P99)
- Error rate by status code
- Database query duration
- GitHub API call count and rate limit remaining

### 3. Health Monitoring

**Endpoints**:
- `/health`: Overall health status
- `/health/liveness`: Container liveness probe
- `/health/readiness`: Container readiness probe

### 4. Alert Configuration

**Alert triggers** (future production setup):
- Error rate > 5% over 5 minutes
- P95 response time > 3 seconds
- Database connection pool exhaustion
- GitHub API rate limit < 10% remaining
- Disk space < 10% available

---

## Migration Strategy

### Initial Database Setup

**Steps**:
1. Create initial Prisma schema
2. Generate migration: `npx prisma migrate dev --name init`
3. Apply migration: `npx prisma migrate deploy`
4. Generate Prisma Client: `npx prisma generate`

### Future Schema Changes

**Process**:
1. Modify Prisma schema
2. Create migration: `npx prisma migrate dev --name descriptive_name`
3. Review generated SQL migration file
4. Test migration on staging database
5. Apply to production: `npx prisma migrate deploy`

### Rollback Strategy

**Approach**:
- Keep migration files in version control
- Use database backups before major migrations
- Implement reversible migrations where possible
- Test rollback procedures in staging

---

## Scalability Considerations

### Current Architecture (Single Instance)

**Limitations**:
- Vertical scaling only (increase container resources)
- Single point of failure
- Limited concurrent request handling

### Future Horizontal Scaling

**Requirements**:
1. **Stateless application**: Already designed (no in-memory state)
2. **Load balancer**: Nginx or AWS ALB to distribute traffic
3. **Shared cache**: Redis for distributed caching
4. **Database connection pooling**: PgBouncer for PostgreSQL
5. **Centralized logging**: ELK stack or CloudWatch
6. **Service discovery**: Kubernetes or Docker Swarm

**Architecture evolution**:
```mermaid
graph TB
    LB[Load Balancer] --> API1[API Instance 1]
    LB --> API2[API Instance 2]
    LB --> API3[API Instance 3]
    API1 --> Redis[Redis Cache]
    API2 --> Redis
    API3 --> Redis
    API1 --> PgBouncer[PgBouncer Pool]
    API2 --> PgBouncer
    API3 --> PgBouncer
    PgBouncer --> DB[(PostgreSQL Primary)]
    DB --> DBReplica[(PostgreSQL Replica)]
```

---

## Conclusion

This design document provides a comprehensive blueprint for implementing the GitHub Repository Management API. The architecture prioritizes:

- **Maintainability**: Clear separation of concerns with layered architecture
- **Scalability**: Stateless design, indexed database queries, pagination
- **Reliability**: Error handling, retry logic, health checks, logging
- **Security**: Input validation, rate limiting, CORS, secure headers
- **Testability**: Dependency injection, interface-based design, test pyramid
- **Performance**: Optimized queries, async processing, connection pooling

The design adheres to all requirements specified in the requirements document and incorporates industry best practices for NestJS, Prisma, PostgreSQL, and Docker-based deployments.
