"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RepositoriesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoriesService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const prom_client_1 = require("prom-client");
const prisma_service_1 = require("../prisma/prisma.service");
const github_service_1 = require("../github/github.service");
const users_service_1 = require("../users/users.service");
let RepositoriesService = RepositoriesService_1 = class RepositoriesService {
    prisma;
    githubService;
    usersService;
    syncCounter;
    syncDuration;
    reposSyncedGauge;
    searchCounter;
    searchDuration;
    searchResultsGauge;
    logger = new common_1.Logger(RepositoriesService_1.name);
    constructor(prisma, githubService, usersService, syncCounter, syncDuration, reposSyncedGauge, searchCounter, searchDuration, searchResultsGauge) {
        this.prisma = prisma;
        this.githubService = githubService;
        this.usersService = usersService;
        this.syncCounter = syncCounter;
        this.syncDuration = syncDuration;
        this.reposSyncedGauge = reposSyncedGauge;
        this.searchCounter = searchCounter;
        this.searchDuration = searchDuration;
        this.searchResultsGauge = searchResultsGauge;
    }
    async syncUserRepositories(username) {
        const startTime = Date.now();
        const timestamp = new Date();
        try {
            const githubUser = await this.githubService.fetchUserData(username);
            const user = await this.usersService.upsertUser(githubUser);
            const githubRepos = await this.githubService.fetchUserRepositories(username);
            await Promise.all(githubRepos.map((repo) => this.prisma.repository.upsert({
                where: {
                    githubId: repo.id,
                },
                update: {
                    name: repo.name,
                    description: repo.description,
                    url: repo.html_url,
                    language: repo.language,
                    createdAt: new Date(repo.created_at),
                    updatedAt: new Date(),
                },
                create: {
                    githubId: repo.id,
                    name: repo.name,
                    description: repo.description,
                    url: repo.html_url,
                    language: repo.language,
                    createdAt: new Date(repo.created_at),
                    userId: user.id,
                },
            })));
            const duration = (Date.now() - startTime) / 1000;
            this.syncCounter.inc({ username, status: 'success' });
            this.syncDuration.observe({ username }, duration);
            this.reposSyncedGauge.set({ username }, githubRepos.length);
            this.logger.log(`Synchronized ${githubRepos.length} repositories for user ${username}`);
            return {
                count: githubRepos.length,
                timestamp,
                username,
            };
        }
        catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            this.syncCounter.inc({ username, status: 'failure' });
            this.syncDuration.observe({ username }, duration);
            throw error;
        }
    }
    async listUserRepositories(username, pagination) {
        const user = await this.usersService.findByLogin(username);
        if (!user) {
            throw new common_1.NotFoundException(`User ${username} not found`);
        }
        const page = pagination.page || 1;
        const limit = pagination.limit || 20;
        const skip = (page - 1) * limit;
        const [repositories, total] = await Promise.all([
            this.prisma.repository.findMany({
                where: { userId: user.id },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.repository.count({
                where: { userId: user.id },
            }),
        ]);
        return {
            data: repositories,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async searchRepositories(searchDto) {
        const startTime = Date.now();
        const page = searchDto.page || 1;
        const limit = searchDto.limit || 20;
        const skip = (page - 1) * limit;
        const keywords = searchDto.q.trim().split(/\s+/);
        const orConditions = keywords.flatMap((keyword) => [
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
            { language: { contains: keyword, mode: 'insensitive' } },
        ]);
        const [repositories, total] = await Promise.all([
            this.prisma.repository.findMany({
                where: {
                    OR: orConditions,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.repository.count({
                where: {
                    OR: orConditions,
                },
            }),
        ]);
        const duration = (Date.now() - startTime) / 1000;
        this.searchCounter.inc({
            has_query: 'true',
            has_language: 'false',
            has_description: 'false',
        });
        this.searchDuration.observe({ has_filters: 'true' }, duration);
        this.searchResultsGauge.set(total);
        return {
            data: repositories,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id) {
        return this.prisma.repository.findUnique({
            where: { id },
        });
    }
    async findByGithubId(githubId) {
        return this.prisma.repository.findUnique({
            where: { githubId },
        });
    }
};
exports.RepositoriesService = RepositoriesService;
exports.RepositoriesService = RepositoriesService = RepositoriesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, nestjs_prometheus_1.InjectMetric)('repository_sync_total')),
    __param(4, (0, nestjs_prometheus_1.InjectMetric)('repository_sync_duration_seconds')),
    __param(5, (0, nestjs_prometheus_1.InjectMetric)('repositories_synced')),
    __param(6, (0, nestjs_prometheus_1.InjectMetric)('repository_searches_total')),
    __param(7, (0, nestjs_prometheus_1.InjectMetric)('repository_search_duration_seconds')),
    __param(8, (0, nestjs_prometheus_1.InjectMetric)('repository_search_results')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        github_service_1.GithubService,
        users_service_1.UsersService,
        prom_client_1.Counter,
        prom_client_1.Histogram,
        prom_client_1.Gauge,
        prom_client_1.Counter,
        prom_client_1.Histogram,
        prom_client_1.Gauge])
], RepositoriesService);
//# sourceMappingURL=repositories.service.js.map