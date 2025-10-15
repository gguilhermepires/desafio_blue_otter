# Development Guide

This guide covers everything you need to know for developing and contributing to the GitHub Repository Management API.

## Development Setup

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Docker** and **Docker Compose**
- **Git**
- **PostgreSQL** (if running locally without Docker)

### Initial Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/gguilhermepires/desafio_blue_otter.git
cd desafio_blue_otter
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/github_repos?schema=public"
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

3. **Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

4. **Run migrations:**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **Start development server:**
```bash
npm run start:dev
```

The API will be available at `http://138.197.49.129` with hot-reload enabled.

## Project Structure

```
desafio_blue_otter/
├── src/
│   ├── app.module.ts           # Root module
│   ├── main.ts                 # Application entry point
│   ├── common/                 # Shared utilities
│   │   ├── dto/               # Common DTOs
│   │   └── decorators/        # Custom decorators
│   ├── modules/
│   │   ├── repositories/      # Repository module
│   │   │   ├── repositories.controller.ts
│   │   │   ├── repositories.service.ts
│   │   │   ├── github.service.ts
│   │   │   └── dto/
│   │   ├── statistics/        # Statistics module
│   │   │   ├── statistics.controller.ts
│   │   │   ├── statistics.service.ts
│   │   │   └── dto/
│   │   ├── logger/            # Logging module
│   │   │   └── logger.service.ts
│   │   └── database/          # Database module
│   │       └── database.service.ts
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration files
├── test/                      # E2E tests
├── docs/                      # VitePress documentation
└── docker-compose.yml         # Docker setup
```

## Development Workflow

### Running the Application

**Development mode with hot-reload:**
```bash
npm run start:dev
```

**Production mode:**
```bash
npm run build
npm run start:prod
```

**Debug mode:**
```bash
npm run start:debug
```

### Database Operations

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

**Open Prisma Studio:**
```bash
npx prisma studio
```

### Code Quality

**Linting:**
```bash
npm run lint
```

**Format code:**
```bash
npm run format
```

**Run tests:**
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Coding Standards

### TypeScript Configuration

- **Strict mode enabled** - Type safety is enforced
- **Decorators enabled** - For NestJS decorators
- **ES2022 target** - Modern JavaScript features

### Naming Conventions

- **Classes:** PascalCase (`RepositoriesService`)
- **Interfaces:** PascalCase with `I` prefix optional (`Repository`)
- **Functions/Methods:** camelCase (`syncRepositories`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Files:** kebab-case (`repositories.service.ts`)

### Module Structure

Each feature module should follow this structure:

```
feature/
├── feature.module.ts        # Module definition
├── feature.controller.ts    # HTTP endpoints
├── feature.service.ts       # Business logic
├── feature.service.spec.ts  # Unit tests
└── dto/                     # Data Transfer Objects
    ├── create-feature.dto.ts
    ├── update-feature.dto.ts
    └── feature-response.dto.ts
```

### DTO Guidelines

Always use DTOs with validation:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDto {
  @ApiProperty({
    description: 'Search query',
    example: 'typescript react'
  })
  @IsString()
  q: string;

  @ApiProperty({
    description: 'Page number',
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

### Service Guidelines

Services should be:
- **Injectable** - Use `@Injectable()` decorator
- **Single Responsibility** - One concern per service
- **Testable** - Easy to mock dependencies
- **Well-documented** - JSDoc comments for public methods

Example:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RepositoriesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Lists repositories for a given user with pagination
   * @param username GitHub username
   * @param page Page number (1-indexed)
   * @param limit Items per page
   * @returns Paginated repository list
   * @throws NotFoundException if user has no repositories
   */
  async list(username: string, page: number, limit: number) {
    // Implementation
  }
}
```

### Controller Guidelines

Controllers should:
- **Validate input** - Use DTOs with class-validator
- **Document endpoints** - Use Swagger decorators
- **Handle errors** - Let NestJS exception filters handle them
- **Stay thin** - Delegate logic to services

Example:

```typescript
import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RepositoriesService } from './repositories.service';
import { SearchDto } from './dto/search.dto';

@ApiTags('repositories')
@Controller('api/repositories')
export class RepositoriesController {
  constructor(private readonly service: RepositoriesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search repositories by keywords' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async search(@Query() dto: SearchDto) {
    return this.service.search(dto);
  }
}
```

## Testing

### Unit Tests

Test files should be colocated with source files:

```typescript
// repositories.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RepositoriesService } from './repositories.service';

describe('RepositoriesService', () => {
  let service: RepositoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<RepositoriesService>(RepositoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### E2E Tests

Located in `test/` directory:

```typescript
// test/repositories.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('RepositoriesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/repositories/search (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/repositories/search?q=test')
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Logging

Use the LoggerService for consistent logging:

```typescript
import { LoggerService } from '../logger/logger.service';

constructor(private readonly logger: LoggerService) {}

this.logger.log('Operation completed', { userId: 123 });
this.logger.error('Operation failed', new Error('Details'));
this.logger.debug('Debug information', { data: {...} });
```

## Documentation

### API Documentation

Use Swagger decorators to document endpoints:

```typescript
@ApiOperation({ summary: 'Sync GitHub repositories for a user' })
@ApiParam({ name: 'username', description: 'GitHub username' })
@ApiResponse({
  status: 201,
  description: 'Repositories synchronized successfully',
  type: SyncResponseDto
})
@ApiResponse({ status: 404, description: 'User not found' })
@ApiResponse({ status: 429, description: 'Rate limit exceeded' })
```

### Code Documentation

Use JSDoc comments for complex logic:

```typescript
/**
 * Calculates language distribution from repositories
 * @param repositories Array of repository objects
 * @returns Object mapping language names to counts
 * @example
 * const dist = calculateLanguageDistribution(repos);
 * // Returns: { TypeScript: 5, JavaScript: 3 }
 */
private calculateLanguageDistribution(repositories: Repository[]) {
  // Implementation
}
```

## Common Tasks

### Adding a New Endpoint

1. Create/update DTO in `dto/` folder
2. Add method to service
3. Add controller endpoint with Swagger docs
4. Write unit tests
5. Write E2E test
6. Update API documentation

### Adding a New Module

1. Generate module: `nest g module feature`
2. Generate service: `nest g service feature`
3. Generate controller: `nest g controller feature`
4. Add to root module imports
5. Configure dependencies
6. Write tests

### Database Schema Changes

1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name change_name`
3. Review generated SQL
4. Update related DTOs and services
5. Run tests

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues
```bash
docker-compose down
docker-compose up -d postgres
npx prisma migrate deploy
```

### Prisma Client Issues
```bash
npx prisma generate
rm -rf node_modules/.prisma
npm install
```

## Next Steps

- [Testing Guide](/testing)
- [Contributing Guidelines](/contributing)
- [API Reference](/api/)
- [Architecture Overview](/architecture)
