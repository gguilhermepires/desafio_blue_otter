# Design Document: GitHub Repository Management API

## 1. Overview

### 1.1 Goals

The GitHub Repository Management API provides a RESTful interface for synchronizing, storing, querying, and analyzing GitHub repository data. The system aims to:

- **Persistent Storage**: Maintain local copies of GitHub repository data to reduce dependency on GitHub API availability
- **Enhanced Search**: Provide advanced search capabilities not available through GitHub's native API
- **Statistical Analysis**: Generate insights and trends from aggregated repository data
- **Performance**: Deliver fast query responses through optimized database indexing and caching strategies
- **Scalability**: Handle concurrent requests and large datasets efficiently

### 1.2 Scope

**In Scope:**
- 4 RESTful API endpoints (sync, list, search, statistics)
- PostgreSQL database with Prisma ORM for data persistence
- GitHub API integration for repository and user data
- Docker containerization with docker-compose orchestration
- Comprehensive logging system with database persistence
- API documentation (Swagger/OpenAPI + VitePress)
- Rate limiting and security controls
- Automated testing with 70% coverage

**Out of Scope:**
- User authentication/authorization (API is open for this version)
- Real-time synchronization or webhooks
- Repository content analysis or code parsing
- GitHub GraphQL API integration
- Multi-database support (PostgreSQL only)

### 1.3 Technology Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: NestJS
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Containerization**: Docker + Docker Compose
- **Documentation**: Swagger/OpenAPI, VitePress
- **Testing**: Jest, Supertest

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```mermaid
graph TB
    Client[API Client]
    API[NestJS API Container]
    DB[(PostgreSQL Container)]
    GitHub[GitHub REST API]

    Client -->|HTTP/REST| API
    API -->|Prisma ORM| DB
    API -->|HTTP| GitHub

    subgraph Docker Compose
        API
        DB
    end

    API -->|Async Write| DB
    API -->|Read/Write| DB
```

### 2.2 Container Architecture

```mermaid
graph LR
    subgraph Docker Network
        A[API Container<br/>Node.js + NestJS]
        B[PostgreSQL Container<br/>postgres:16-alpine]
    end

    A -->|DATABASE_URL| B
    B -->|Volume Mount| V[postgres_data]
    A -->|Port 3000| Host[Host Machine]
    B -->|Port 5432| Host
```

### 2.3 Layered Architecture

```mermaid
graph TB
    subgraph Presentation Layer
        Controllers[Controllers<br/>HTTP Request Handling]
        DTOs[DTOs<br/>Validation & Transformation]
        Interceptors[Interceptors<br/>Logging, Transform]
    end

    subgraph Business Layer
        Services[Services<br/>Business Logic]
        GitHub[GitHub Service<br/>External API]
        Stats[Statistics Service<br/>Calculations]
    end

    subgraph Data Layer
        Prisma[Prisma Service<br/>ORM]
        Repos[Repositories<br/>Data Access]
    end

    subgraph Database
        DB[(PostgreSQL<br/>Users, Repositories, Logs)]
    end

    Controllers --> Services
    Controllers --> DTOs
    Services --> Prisma
    Services --> GitHub
    Services --> Stats
    Prisma --> DB
    Repos --> Prisma
    Interceptors --> Services
```

---

## 3. Data Flow Diagrams

### 3.1 Repository Synchronization Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant SyncService
    participant GitHubService
    participant PrismaService
    participant DB
    participant Logger

    Client->>Controller: POST /api/sync/:username
    Controller->>SyncService: syncUserRepositories(username)
    SyncService->>GitHubService: fetchUserData(username)
    GitHubService->>GitHub: GET /users/:username
    GitHub-->>GitHubService: User Data
    GitHubService-->>SyncService: User Data

    SyncService->>GitHubService: fetchUserRepos(username)
    GitHubService->>GitHub: GET /users/:username/repos
    GitHub-->>GitHubService: Repositories Array
    GitHubService-->>SyncService: Repositories Data

    SyncService->>PrismaService: upsertUser(userData)
    PrismaService->>DB: INSERT/UPDATE User
    DB-->>PrismaService: User Record

    loop For each repository
        SyncService->>PrismaService: upsertRepository(repoData)
        PrismaService->>DB: INSERT/UPDATE Repository
        DB-->>PrismaService: Repository Record
    end

    SyncService->>Logger: logSyncSuccess(stats)
    Logger->>DB: INSERT Log (async)

    SyncService-->>Controller: SyncResult
    Controller-->>Client: 201 Created {count, timestamp}
```

### 3.2 Search Flow with Pagination

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant SearchService
    participant PrismaService
    participant DB

    Client->>Controller: GET /api/search?q=keywords&page=1&limit=20
    Controller->>SearchService: searchRepositories(query, pagination)
    SearchService->>PrismaService: findManyWithSearch(query, pagination)

    PrismaService->>DB: SELECT with WHERE ILIKE
    DB-->>PrismaService: Matching Records + Count

    PrismaService-->>SearchService: Repositories + Metadata
    SearchService-->>Controller: SearchResult
    Controller-->>Client: 200 OK {data, metadata}
```

### 3.3 Statistics Generation Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant StatsService
    participant PrismaService
    participant DB

    Client->>Controller: GET /api/stats?user=username&topN=5
    Controller->>StatsService: generateStatistics(options)

    par Parallel Queries
        StatsService->>PrismaService: countRepositories(filter)
        PrismaService->>DB: SELECT COUNT(*)
        and
        StatsService->>PrismaService: groupByLanguage(filter)
        PrismaService->>DB: SELECT language, COUNT(*)
        and
        StatsService->>PrismaService: groupByMonth(filter)
        PrismaService->>DB: SELECT DATE_TRUNC, COUNT(*)
        and
        StatsService->>PrismaService: topUsersByRepos(topN)
        PrismaService->>DB: SELECT user, COUNT(*) GROUP BY
    end

    StatsService->>StatsService: aggregateResults()
    StatsService-->>Controller: Statistics Object
    Controller-->>Client: 200 OK {summary, languages, timeline, top_users}
```

---

## 4. Component Design

### 4.1 Module Structure

```
src/
├── main.ts                       # Application bootstrap
├── app.module.ts                 # Root module
├── common/                       # Shared utilities
│   ├── decorators/
│   ├── filters/                  # Exception filters
│   ├── guards/                   # Rate limiting guard
│   ├── interceptors/             # Logging interceptor
│   └── pipes/                    # Validation pipes
├── config/                       # Configuration
│   ├── database.config.ts
│   ├── cors.config.ts
│   └── swagger.config.ts
├── modules/
│   ├── repositories/
│   │   ├── repositories.module.ts
│   │   ├── repositories.controller.ts
│   │   ├── repositories.service.ts
│   │   ├── dto/
│   │   │   ├── sync.dto.ts
│   │   │   ├── list.dto.ts
│   │   │   └── search.dto.ts
│   │   └── entities/
│   │       └── repository.entity.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   ├── statistics/
│   │   ├── statistics.module.ts
│   │   ├── statistics.controller.ts
│   │   ├── statistics.service.ts
│   │   └── dto/
│   │       └── stats.dto.ts
│   ├── github/
│   │   ├── github.module.ts
│   │   ├── github.service.ts
│   │   └── interfaces/
│   │       ├── github-user.interface.ts
│   │       └── github-repo.interface.ts
│   ├── logger/
│   │   ├── logger.module.ts
│   │   ├── logger.service.ts
│   │   └── entities/
│   │       └── log.entity.ts
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
└── prisma/
    ├── schema.prisma             # Prisma schema
    └── migrations/               # Database migrations
```

### 4.2 Controller Design

#### 4.2.1 RepositoriesController

```typescript
@Controller('api/repositories')
@ApiTags('repositories')
export class RepositoriesController {

  @Post('sync/:username')
  @ApiOperation({ summary: 'Sync GitHub repositories for a user' })
  @ApiResponse({ status: 201, description: 'Repositories synced successfully' })
  async syncRepositories(
    @Param('username') username: string
  ): Promise<SyncResponseDto>

  @Get('list/:username')
  @ApiOperation({ summary: 'List repositories for a user' })
  @ApiResponse({ status: 200, description: 'Repositories retrieved successfully' })
  async listRepositories(
    @Param('username') username: string,
    @Query() paginationDto: PaginationDto
  ): Promise<ListResponseDto>

  @Get('search')
  @ApiOperation({ summary: 'Search repositories by keywords' })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async searchRepositories(
    @Query() searchDto: SearchDto
  ): Promise<SearchResponseDto>
}
```

#### 4.2.2 StatisticsController

```typescript
@Controller('api/statistics')
@ApiTags('statistics')
export class StatisticsController {

  @Get()
  @ApiOperation({ summary: 'Get repository statistics' })
  @ApiResponse({ status: 200, description: 'Statistics calculated successfully' })
  async getStatistics(
    @Query() statsDto: StatisticsDto
  ): Promise<StatisticsResponseDto>
}
```

### 4.3 Service Design

#### 4.3.1 RepositoriesService

**Responsibilities:**
- Orchestrate synchronization workflow
- Validate and transform repository data
- Handle upsert logic for users and repositories
- Manage pagination and sorting

**Key Methods:**
```typescript
class RepositoriesService {
  async syncUserRepositories(username: string): Promise<SyncResult>
  async listUserRepositories(username: string, pagination: Pagination): Promise<PaginatedResult>
  async searchRepositories(query: string, pagination: Pagination): Promise<SearchResult>
}
```

#### 4.3.2 GitHubService

**Responsibilities:**
- Make HTTP requests to GitHub API
- Handle rate limiting and retries with exponential backoff
- Transform GitHub API responses to internal format
- Manage GitHub API pagination

**Key Methods:**
```typescript
class GitHubService {
  async fetchUserData(username: string): Promise<GitHubUser>
  async fetchUserRepositories(username: string): Promise<GitHubRepository[]>
  private async handleRateLimit(): Promise<void>
  private async retryWithBackoff(fn: Function, retries: number): Promise<any>
}
```

#### 4.3.3 StatisticsService

**Responsibilities:**
- Calculate summary statistics (total repos, users)
- Group repositories by language
- Generate monthly timeline histograms
- Compute top users rankings

**Key Methods:**
```typescript
class StatisticsService {
  async generateStatistics(options: StatsOptions): Promise<Statistics>
  private async calculateSummary(filter?: Filter): Promise<Summary>
  private async groupByLanguage(filter?: Filter): Promise<LanguageStats>
  private async generateTimeline(filter?: Filter): Promise<Timeline>
  private async getTopUsers(topN: number): Promise<TopUsers[]>
}
```

#### 4.3.4 LoggerService

**Responsibilities:**
- Async logging to database
- Structured log formatting (JSON)
- Log level filtering
- Automatic log retention cleanup

**Key Methods:**
```typescript
class LoggerService {
  async log(message: string, context?: object): Promise<void>
  async error(message: string, trace?: string, context?: object): Promise<void>
  async warn(message: string, context?: object): Promise<void>
  async debug(message: string, context?: object): Promise<void>
  async cleanupOldLogs(days: number): Promise<number>
}
```

---

## 5. Data Models

### 5.1 Prisma Schema

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
  id            Int          @id @default(autoincrement())
  githubId      Int          @unique @map("github_id")
  login         String       @unique
  avatarUrl     String?      @map("avatar_url")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  repositories  Repository[]

  @@map("users")
  @@index([login])
  @@index([githubId])
}

model Repository {
  id            Int       @id @default(autoincrement())
  githubId      Int       @unique @map("github_id")
  name          String
  description   String?
  url           String
  language      String?
  createdAt     DateTime  @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  userId        Int       @map("user_id")
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("repositories")
  @@index([userId])
  @@index([name])
  @@index([language])
  @@index([createdAt])
  @@index([githubId])
}

model Log {
  id            String    @id @default(uuid())
  timestamp     DateTime  @default(now())
  level         LogLevel
  message       String
  context       Json?
  stackTrace    String?   @map("stack_trace")
  metadata      Json?

  @@map("logs")
  @@index([timestamp])
  @@index([level])
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}
```

### 5.2 Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Repository : has

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
        int userId FK
    }

    Log {
        string id PK
        datetime timestamp
        enum level
        string message
        json context
        string stackTrace
        json metadata
    }
```

### 5.3 DTO Definitions

#### 5.3.1 Sync DTOs

```typescript
// sync-response.dto.ts
export class SyncResponseDto {
  @ApiProperty({ description: 'Number of repositories synchronized' })
  count: number;

  @ApiProperty({ description: 'Timestamp of synchronization' })
  timestamp: Date;

  @ApiProperty({ description: 'Username synchronized' })
  username: string;
}
```

#### 5.3.2 Pagination DTOs

```typescript
// pagination.dto.ts
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class PaginationMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
```

#### 5.3.3 Search DTOs

```typescript
// search.dto.ts
export class SearchDto extends PaginationDto {
  @ApiProperty({ description: 'Search keywords' })
  @IsNotEmpty()
  @IsString()
  q: string;
}

export class SearchResponseDto {
  @ApiProperty({ type: [RepositoryDto] })
  data: RepositoryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
```

#### 5.3.4 Statistics DTOs

```typescript
// statistics.dto.ts
export class StatisticsDto {
  @ApiPropertyOptional({ description: 'Filter by username' })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  topN?: number = 5;
}

export class StatisticsResponseDto {
  @ApiProperty()
  summary: {
    total_repos: number;
    total_users?: number; // Only for global stats
  };

  @ApiProperty()
  languages: Record<string, number>;

  @ApiProperty()
  top_users_by_repos?: Array<{ login: string; count: number }>;

  @ApiProperty()
  timeline_created_monthly: Record<string, number>;
}
```

---

## 6. Business Process Flows

### 6.1 Sync Process Flowchart

```mermaid
flowchart TD
    Start([Receive Sync Request]) --> Validate[Validate Username]
    Validate -->|Invalid| Error400[Return 400 Bad Request]
    Validate -->|Valid| FetchUser[Fetch User from GitHub API]

    FetchUser -->|404| Error404[Return 404 Not Found]
    FetchUser -->|429| Error429[Return 429 Rate Limit]
    FetchUser -->|Success| UpsertUser[Upsert User in DB]

    UpsertUser --> FetchRepos[Fetch Repositories from GitHub]
    FetchRepos -->|Error| Error502[Return 502 Bad Gateway]
    FetchRepos -->|Success| LoopRepos{For Each Repo}

    LoopRepos -->|More Repos| ValidateRepo[Validate Repo Data]
    ValidateRepo --> UpsertRepo[Upsert Repository in DB]
    UpsertRepo --> LoopRepos

    LoopRepos -->|Done| LogSuccess[Log Sync Success]
    LogSuccess --> Return201[Return 201 Created]
    Return201 --> End([End])

    Error400 --> End
    Error404 --> End
    Error429 --> End
    Error502 --> End
```

### 6.2 Search Process with Relevance Ordering

```mermaid
flowchart TD
    Start([Receive Search Request]) --> ValidateQ{Keywords Valid?}
    ValidateQ -->|No| Error400[Return 400 Bad Request]
    ValidateQ -->|Yes| ParseKeywords[Parse Keywords - Split by Space]

    ParseKeywords --> BuildQuery[Build SQL Query with OR conditions]
    BuildQuery --> ExactMatch[Search: Exact Matches First]
    ExactMatch --> PartialMatch[Search: Partial Matches Second]

    PartialMatch --> SortByDate[Sort by Created Date DESC]
    SortByDate --> ApplyPagination[Apply Pagination]

    ApplyPagination --> CountTotal[Count Total Matches]
    CountTotal --> BuildMeta[Build Pagination Metadata]

    BuildMeta --> Return200[Return 200 OK with Results]
    Return200 --> End([End])
    Error400 --> End
```

### 6.3 Statistics Calculation Process

```mermaid
flowchart TD
    Start([Receive Stats Request]) --> CheckUser{User Param?}
    CheckUser -->|Yes| ValidateUser[Validate User Exists]
    ValidateUser -->|Not Found| ReturnEmpty[Return Empty Stats]
    ValidateUser -->|Found| SetFilter[Set User Filter]
    CheckUser -->|No| SetGlobal[Set Global Filter]

    SetFilter --> ParallelQueries[Execute Parallel Queries]
    SetGlobal --> ParallelQueries

    ParallelQueries --> Q1[Count Total Repos]
    ParallelQueries --> Q2[Count Total Users - Global Only]
    ParallelQueries --> Q3[Group By Language]
    ParallelQueries --> Q4[Group By Month]
    ParallelQueries --> Q5[Top N Users - Global Only]

    Q1 --> Aggregate[Aggregate Results]
    Q2 --> Aggregate
    Q3 --> Aggregate
    Q4 --> Aggregate
    Q5 --> Aggregate

    Aggregate --> FillGaps[Fill Missing Months in Timeline]
    FillGaps --> FormatResponse[Format Response]
    FormatResponse --> Return200[Return 200 OK]
    Return200 --> End([End])
    ReturnEmpty --> End
```

---

## 7. Error Handling Strategy

### 7.1 Error Categories and HTTP Status Codes

| Error Type | HTTP Status | Description | Example |
|-----------|-------------|-------------|---------|
| Validation Error | 400 | Invalid input data | Missing required field, invalid format |
| Not Found | 404 | Resource not found | GitHub user doesn't exist |
| Rate Limit | 429 | GitHub API rate limit exceeded | Too many requests to GitHub |
| External API Error | 502 | GitHub API failure | GitHub service unavailable |
| Internal Server Error | 500 | Unexpected application error | Database connection failure |

### 7.2 Global Exception Filter

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof PrismaClientKnownRequestError) {
      // Handle Prisma errors
      status = HttpStatus.BAD_REQUEST;
      message = 'Database operation failed';
    }

    // Log error (async, non-blocking)
    this.logger.error(message, exception.stack, {
      endpoint: request.url,
      method: request.method,
      statusCode: status,
    });

    // Return structured error
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 7.3 GitHub API Error Handling

```typescript
async fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await this.httpService.get(url).toPromise();

      // Check rate limit
      const remaining = response.headers['x-ratelimit-remaining'];
      if (remaining && parseInt(remaining) < 10) {
        this.logger.warn('GitHub rate limit low', { remaining });
      }

      return response.data;

    } catch (error) {
      if (error.response?.status === 429) {
        const resetTime = error.response.headers['x-ratelimit-reset'];
        const waitTime = (resetTime * 1000) - Date.now();
        throw new HttpException('GitHub rate limit exceeded', 429);
      }

      if (error.response?.status === 404) {
        throw new NotFoundException('GitHub user not found');
      }

      // Exponential backoff
      if (i < retries - 1) {
        await this.sleep(Math.pow(2, i) * 1000);
        continue;
      }

      throw new BadGatewayException('GitHub API error');
    }
  }
}
```

---

## 8. Testing Strategy

### 8.1 Testing Pyramid

```mermaid
graph TD
    E2E[E2E Tests<br/>10%<br/>Full API flow tests]
    Integration[Integration Tests<br/>30%<br/>Controller + Service + DB]
    Unit[Unit Tests<br/>60%<br/>Service logic, utilities]

    E2E --> Integration
    Integration --> Unit
```

### 8.2 Unit Testing

**Target: 70% code coverage**

**Test Suites:**
- `RepositoriesService` - Business logic for sync, list, search
- `GitHubService` - API calls, retry logic, error handling
- `StatisticsService` - Calculations, aggregations
- `LoggerService` - Async logging, retention

**Example: RepositoriesService Unit Test**
```typescript
describe('RepositoriesService', () => {
  let service: RepositoriesService;
  let prismaService: PrismaService;
  let githubService: GitHubService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        {
          provide: PrismaService,
          useValue: { user: { upsert: jest.fn() }, repository: { upsert: jest.fn() } },
        },
        {
          provide: GitHubService,
          useValue: { fetchUserData: jest.fn(), fetchUserRepositories: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RepositoriesService>(RepositoriesService);
  });

  it('should sync user repositories successfully', async () => {
    const mockUser = { id: 123, login: 'testuser' };
    const mockRepos = [{ id: 1, name: 'repo1' }];

    jest.spyOn(githubService, 'fetchUserData').mockResolvedValue(mockUser);
    jest.spyOn(githubService, 'fetchUserRepositories').mockResolvedValue(mockRepos);

    const result = await service.syncUserRepositories('testuser');

    expect(result.count).toBe(1);
    expect(prismaService.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { githubId: 123 },
    }));
  });
});
```

### 8.3 Integration Testing

**Test Suites:**
- API endpoints with real database (test DB)
- Mocked GitHub API responses
- Transaction rollback after each test

**Example: Search Endpoint Integration Test**
```typescript
describe('RepositoriesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  it('/api/search (GET) - should return matching repositories', async () => {
    // Seed test data
    await prisma.repository.create({
      data: { name: 'test-repo', githubId: 1, url: 'http://...', userId: 1 },
    });

    return request(app.getHttpServer())
      .get('/api/search?q=test')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe('test-repo');
      });
  });
});
```

### 8.4 E2E Testing

**Scenarios:**
1. Complete sync flow: GitHub → Database → List
2. Search with pagination
3. Statistics calculation with various filters
4. Error scenarios (404, 429, 502)

---

## 9. Security Design

### 9.1 Rate Limiting

**Implementation using `@nestjs/throttler`:**

```typescript
// app.module.ts
ThrottlerModule.forRoot({
  ttl: 60,        // 60 seconds
  limit: 100,     // 100 requests per minute per IP
}),

// Apply globally
APP_GUARD: ThrottlerGuard
```

### 9.2 Input Validation

**Using class-validator:**

```typescript
export class SearchDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, { message: 'Invalid characters in search query' })
  q: string;
}
```

### 9.3 CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### 9.4 SQL Injection Prevention

**Prisma provides automatic protection:**
- Parameterized queries
- Type-safe query building
- No raw SQL execution by default

---

## 10. Performance Optimizations

### 10.1 Database Indexing Strategy

```sql
-- User indexes
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_login ON users(login);

-- Repository indexes
CREATE INDEX idx_repositories_user_id ON repositories(user_id);
CREATE INDEX idx_repositories_name ON repositories(name);
CREATE INDEX idx_repositories_language ON repositories(language);
CREATE INDEX idx_repositories_created_at ON repositories(created_at);
CREATE INDEX idx_repositories_github_id ON repositories(github_id);

-- Log indexes
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_level ON logs(level);

-- Composite index for search
CREATE INDEX idx_repositories_search ON repositories(name, description, language);
```

### 10.2 Connection Pooling

```typescript
// Prisma connection pool configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // Connection pool settings
  connection_limit = 10
  pool_timeout = 20
}
```

### 10.3 Pagination Implementation

```typescript
async findWithPagination(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.repository.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.repository.count(),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

---

## 11. Deployment Architecture

### 11.1 Docker Configuration

**Dockerfile (Multi-stage build):**

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: github_api_db
    environment:
      POSTGRES_DB: github_repos
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app_network

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: github_api
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/github_repos
      NODE_ENV: production
      PORT: 3000
      CORS_ORIGINS: http://localhost:3000,http://localhost:5173
      LOG_LEVEL: info
      LOG_RETENTION_DAYS: 30
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app_network

volumes:
  postgres_data:

networks:
  app_network:
    driver: bridge
```

### 11.2 Environment Variables

**.env.example:**

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/github_repos"
DB_PASSWORD="your_secure_password"

# Application
NODE_ENV="development"
PORT=3000

# CORS
CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:8080"

# Logging
LOG_LEVEL="debug"
LOG_RETENTION_DAYS=30

# GitHub API (optional - for rate limit increase)
GITHUB_TOKEN=""

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 12. Logging Architecture

### 12.1 Logging Flow

```mermaid
sequenceDiagram
    participant Request
    participant Interceptor
    participant Service
    participant LoggerService
    participant Queue
    participant DB

    Request->>Interceptor: HTTP Request
    Interceptor->>LoggerService: log(request details)
    LoggerService->>Queue: Push to async queue
    Queue-->>LoggerService: Acknowledge
    LoggerService-->>Interceptor: Continue

    Interceptor->>Service: Process request
    Service-->>Interceptor: Response
    Interceptor->>LoggerService: log(response details)
    LoggerService->>Queue: Push to async queue

    Queue->>DB: Batch insert logs
    DB-->>Queue: Success
```

### 12.2 Log Retention Cleanup

**Cron job for log cleanup:**

```typescript
@Injectable()
export class LogCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  @Cron('0 2 * * *') // Run daily at 2 AM
  async cleanupOldLogs() {
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleted = await this.prisma.log.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.info(`Cleaned up ${deleted.count} old logs`, {
      retentionDays,
      cutoffDate,
    });
  }
}
```

---

## 13. API Documentation

### 13.1 Swagger Configuration

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('GitHub Repository Management API')
  .setDescription('API for synchronizing, querying, and analyzing GitHub repository data')
  .setVersion('1.0')
  .addTag('repositories', 'Repository synchronization and search')
  .addTag('statistics', 'Repository statistics and analytics')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### 13.2 VitePress Documentation Structure

```
docs/
├── .vitepress/
│   └── config.ts
├── index.md                    # Home page
├── getting-started.md          # Setup guide
├── architecture/
│   ├── overview.md
│   ├── system-design.md
│   └── data-models.md
├── api/
│   ├── endpoints.md
│   ├── sync.md
│   ├── list.md
│   ├── search.md
│   └── statistics.md
├── development/
│   ├── setup.md
│   ├── testing.md
│   └── contributing.md
└── deployment/
    ├── docker.md
    └── environment-variables.md
```

---

## 14. Conclusion

This design document provides a comprehensive blueprint for implementing the GitHub Repository Management API. The architecture follows NestJS best practices with clean separation of concerns, emphasizes type safety through TypeScript and Prisma, and prioritizes performance, security, and maintainability.

**Key Design Decisions:**

1. **Layered Architecture**: Clear separation between controllers, services, and data access
2. **Prisma ORM**: Type-safe database operations with automatic migrations
3. **Async Logging**: Non-blocking database logging to prevent performance degradation
4. **Docker Compose**: Simple orchestration for local development and deployment
5. **Comprehensive Testing**: 70% coverage target with unit, integration, and E2E tests
6. **Security First**: Rate limiting, input validation, SQL injection prevention
7. **Performance Optimized**: Database indexing, connection pooling, pagination

**Next Steps:**
- Proceed to implementation tasks phase
- Set up project scaffolding with NestJS CLI
- Implement Prisma schema and migrations
- Develop core features following this design
