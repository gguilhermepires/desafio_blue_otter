# Testing

Comprehensive testing guide for the GitHub Repository Management API.

## Test Coverage

Current test coverage: **73%**

```bash
# Run tests with coverage
npm run test:cov
```

## Testing Stack

- **Jest** - Testing framework
- **Supertest** - HTTP assertions
- **@nestjs/testing** - NestJS testing utilities

## Test Types

### Unit Tests

Test individual components in isolation.

**Location:** Colocated with source files (`*.spec.ts`)

**Example:** `repositories.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RepositoriesService } from './repositories.service';
import { DatabaseService } from '../database/database.service';
import { GithubService } from './github.service';

describe('RepositoriesService', () => {
  let service: RepositoriesService;
  let databaseService: DatabaseService;
  let githubService: GithubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        {
          provide: DatabaseService,
          useValue: {
            repository: {
              findMany: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
        {
          provide: GithubService,
          useValue: {
            fetchUserRepositories: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RepositoriesService>(RepositoriesService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    githubService = module.get<GithubService>(GithubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated repositories', async () => {
      const mockRepos = [
        { id: 1, name: 'repo1', owner: 'user1' },
        { id: 2, name: 'repo2', owner: 'user1' },
      ];

      jest.spyOn(databaseService.repository, 'findMany').mockResolvedValue(mockRepos);

      const result = await service.list('user1', 1, 10);

      expect(result.data).toEqual(mockRepos);
      expect(databaseService.repository.findMany).toHaveBeenCalledWith({
        where: { owner: 'user1' },
        skip: 0,
        take: 10,
      });
    });

    it('should throw NotFoundException when no repos found', async () => {
      jest.spyOn(databaseService.repository, 'findMany').mockResolvedValue([]);

      await expect(service.list('nonexistent', 1, 10)).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Integration Tests

Test multiple components working together.

**Location:** `test/` directory

**Example:** `test/repositories.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('RepositoriesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/repositories/sync/:username (POST)', () => {
    it('should sync repositories for valid user', () => {
      return request(app.getHttpServer())
        .post('/api/repositories/sync/octocat')
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('count');
          expect(res.body).toHaveProperty('username', 'octocat');
        });
    });

    it('should return 404 for nonexistent user', () => {
      return request(app.getHttpServer())
        .post('/api/repositories/sync/nonexistentuser12345')
        .expect(404);
    });
  });

  describe('/api/repositories/list/:username (GET)', () => {
    it('should list repositories with pagination', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/list/octocat?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should validate pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/list/octocat?page=0&limit=200')
        .expect(400);
    });
  });

  describe('/api/repositories/search (GET)', () => {
    it('should search repositories', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/search?q=typescript')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
        });
    });

    it('should require search query', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/search')
        .expect(400);
    });
  });

  describe('/api/statistics (GET)', () => {
    it('should return statistics', () => {
      return request(app.getHttpServer())
        .get('/api/statistics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalRepositories');
          expect(res.body).toHaveProperty('languageDistribution');
          expect(res.body).toHaveProperty('topRepositoriesByStars');
        });
    });
  });
});
```

### E2E Tests

End-to-end tests simulating real user workflows.

```typescript
describe('Complete User Workflow (e2e)', () => {
  it('should complete full sync and search workflow', async () => {
    // 1. Sync repositories
    const syncResponse = await request(app.getHttpServer())
      .post('/api/repositories/sync/octocat')
      .expect(201);

    expect(syncResponse.body.count).toBeGreaterThan(0);

    // 2. List repositories
    const listResponse = await request(app.getHttpServer())
      .get('/api/repositories/list/octocat')
      .expect(200);

    expect(listResponse.body.data.length).toBeGreaterThan(0);

    // 3. Search repositories
    const searchResponse = await request(app.getHttpServer())
      .get('/api/repositories/search?q=hello')
      .expect(200);

    // 4. Get statistics
    const statsResponse = await request(app.getHttpServer())
      .get('/api/statistics?user=octocat')
      .expect(200);

    expect(statsResponse.body.totalRepositories).toBeGreaterThan(0);
  });
});
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:cov
```

### E2E Tests

```bash
npm run test:e2e
```

### Specific File

```bash
npm test -- repositories.service.spec.ts
```

### With Debugging

```bash
npm run test:debug
```

Then attach debugger to port 9229.

## Writing Tests

### Test Structure

Follow the **AAA pattern** (Arrange, Act, Assert):

```typescript
it('should calculate total stars', async () => {
  // Arrange
  const repos = [
    { stars: 100 },
    { stars: 200 },
  ];

  // Act
  const total = calculateTotalStars(repos);

  // Assert
  expect(total).toBe(300);
});
```

### Mocking

**Mock dependencies:**
```typescript
const mockGithubService = {
  fetchUserRepositories: jest.fn().mockResolvedValue([
    { id: 1, name: 'repo1' },
  ]),
};
```

**Mock Prisma:**
```typescript
const mockPrisma = {
  repository: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
```

**Spy on methods:**
```typescript
jest.spyOn(service, 'method').mockResolvedValue(result);
```

### Test Data

Create test fixtures:

```typescript
// test/fixtures/repositories.fixture.ts
export const mockRepositories = [
  {
    id: 1,
    githubId: 1296269,
    name: 'Hello-World',
    owner: 'octocat',
    description: 'My first repository',
    language: 'JavaScript',
    stargazersCount: 1500,
    forksCount: 800,
    url: 'https://github.com/octocat/Hello-World',
    createdAt: new Date('2011-01-26'),
    updatedAt: new Date('2025-01-01'),
  },
  // More fixtures...
];
```

Use in tests:
```typescript
import { mockRepositories } from '../fixtures/repositories.fixture';

jest.spyOn(databaseService.repository, 'findMany')
  .mockResolvedValue(mockRepositories);
```

## Test Configuration

### jest.config.js

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
};
```

### E2E Test Config

```javascript
// test/jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

## Best Practices

### 1. Test Isolation

Each test should be independent:

```typescript
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up
});
```

### 2. Descriptive Names

```typescript
// Good
it('should return 404 when user does not exist', () => {});

// Bad
it('should work', () => {});
```

### 3. Test Both Success and Failure

```typescript
describe('sync', () => {
  it('should sync repositories successfully', () => {});
  it('should throw NotFoundException for invalid user', () => {});
  it('should handle GitHub API errors', () => {});
  it('should handle rate limit errors', () => {});
});
```

### 4. Use Test Helpers

```typescript
// test/helpers/setup.ts
export async function createTestApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe());
  await app.init();
  return app;
}
```

### 5. Coverage Goals

- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

Focus on:
- Business logic
- Error handling
- Edge cases
- Complex calculations

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: github_repos_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/github_repos_test

      - name: Run tests
        run: npm run test:cov

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Debugging Tests

### VS Code Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "--watchAll=false",
    "${file}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Specific Test

```bash
node --inspect-brk -r tsconfig-paths/register -r ts-node/register \
  node_modules/.bin/jest --runInBand --no-cache \
  src/modules/repositories/repositories.service.spec.ts
```

## Test Database

### Setup

```bash
# Create test database
createdb github_repos_test

# Run migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/github_repos_test" \
  npx prisma migrate deploy
```

### Cleanup

```bash
# Reset between test runs
npx prisma migrate reset --force
```

### Seed Test Data

```typescript
// test/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  await prisma.repository.createMany({
    data: [
      {
        githubId: 1,
        name: 'test-repo-1',
        owner: 'testuser',
        // ... other fields
      },
    ],
  });
}

seed();
```

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery.yml
config:
  target: 'http://138.197.49.129'
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: 'Search repositories'
    flow:
      - get:
          url: '/api/repositories/search?q=typescript'
```

Run:
```bash
artillery run artillery.yml
```

## Next Steps

- [Development Guide](/development)
- [Contributing Guidelines](/contributing)
- [Architecture Overview](/architecture)
