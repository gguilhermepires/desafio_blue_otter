import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Repositories API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Clean up test data
    await prisma.repository.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.repository.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('/api/repositories/sync/:username (POST)', () => {
    it('should return 404 for non-existent GitHub user', () => {
      return request(app.getHttpServer())
        .post('/api/repositories/sync/nonexistentuser123456789')
        .expect(404);
    }, 30000);

    it('should sync repositories for a valid GitHub user', () => {
      // Note: This test requires actual GitHub API access
      // In a real test environment, we would mock the GitHub API
      return request(app.getHttpServer())
        .post('/api/repositories/sync/octocat')
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('count');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('username');
          expect(res.body.username).toBe('octocat');
          expect(typeof res.body.count).toBe('number');
        });
    }, 30000);
  });

  describe('/api/repositories/list/:username (GET)', () => {
    it('should return empty list for user with no synced repositories', async () => {
      // Create a user without repositories
      await prisma.user.create({
        data: {
          githubId: 999999,
          login: 'emptyuser',
          avatarUrl: 'https://github.com/avatar.png',
        },
      });

      return request(app.getHttpServer())
        .get('/api/repositories/list/emptyuser')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toEqual([]);
          expect(res.body.meta.total).toBe(0);
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/list/nonexistentuser')
        .expect(404);
    });

    it('should support pagination parameters', async () => {
      return request(app.getHttpServer())
        .get('/api/repositories/list/emptyuser?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('totalPages');
        });
    });

    it('should validate pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/list/emptyuser?page=-1&limit=0')
        .expect(400);
    });
  });

  describe('/api/repositories/search (GET)', () => {
    it('should search repositories by keyword', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/search?q=test')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should return 400 when query is missing', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/search')
        .expect(400);
    });

    it('should return 400 when query is empty', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/search?q=')
        .expect(400);
    });

    it('should support pagination in search', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/search?q=test&page=1&limit=20')
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.page).toBe(1);
          expect(res.body.meta.limit).toBe(20);
        });
    });

    it('should handle multiple keywords', () => {
      return request(app.getHttpServer())
        .get('/api/repositories/search?q=TypeScript+React')
        .expect(200);
    });
  });

  describe('/api/statistics (GET)', () => {
    it('should return global statistics', () => {
      return request(app.getHttpServer())
        .get('/api/statistics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('summary');
          expect(res.body).toHaveProperty('languages');
          expect(res.body).toHaveProperty('timeline_created_monthly');
          expect(res.body).toHaveProperty('top_users_by_repos');
          expect(res.body.summary).toHaveProperty('total_repos');
          expect(res.body.summary).toHaveProperty('total_users');
        });
    });

    it('should return user-specific statistics', () => {
      return request(app.getHttpServer())
        .get('/api/statistics?user=emptyuser')
        .expect(200)
        .expect((res) => {
          expect(res.body.summary).toHaveProperty('total_repos');
          expect(res.body.summary).not.toHaveProperty('total_users');
          expect(res.body).not.toHaveProperty('top_users_by_repos');
        });
    });

    it('should support custom topN parameter', () => {
      return request(app.getHttpServer())
        .get('/api/statistics?topN=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.top_users_by_repos.length).toBeLessThanOrEqual(10);
        });
    });

    it('should validate topN parameter', () => {
      return request(app.getHttpServer())
        .get('/api/statistics?topN=0')
        .expect(400);
    });

    it('should cap topN at 20', () => {
      return request(app.getHttpServer())
        .get('/api/statistics?topN=100')
        .expect(200)
        .expect((res) => {
          // The API should cap it at 20
          expect(res.body.top_users_by_repos.length).toBeLessThanOrEqual(20);
        });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', () => {
      return request(app.getHttpServer())
        .get('/api/unknown-endpoint')
        .expect(404);
    });

    it('should handle malformed requests', () => {
      return request(app.getHttpServer())
        .post('/api/repositories/sync/')
        .expect(404);
    });
  });
});
