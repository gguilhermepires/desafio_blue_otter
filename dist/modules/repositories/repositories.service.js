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
var RepositoriesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const github_service_1 = require("../github/github.service");
const users_service_1 = require("../users/users.service");
let RepositoriesService = RepositoriesService_1 = class RepositoriesService {
    prisma;
    githubService;
    usersService;
    logger = new common_1.Logger(RepositoriesService_1.name);
    constructor(prisma, githubService, usersService) {
        this.prisma = prisma;
        this.githubService = githubService;
        this.usersService = usersService;
    }
    async syncUserRepositories(username) {
        const timestamp = new Date();
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
        this.logger.log(`Synchronized ${githubRepos.length} repositories for user ${username}`);
        return {
            count: githubRepos.length,
            timestamp,
            username,
        };
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        github_service_1.GithubService,
        users_service_1.UsersService])
], RepositoriesService);
//# sourceMappingURL=repositories.service.js.map