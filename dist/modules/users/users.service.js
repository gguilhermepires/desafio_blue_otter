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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = UsersService_1 = class UsersService {
    prisma;
    logger = new common_1.Logger(UsersService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async upsertUser(githubUser) {
        try {
            const user = await this.prisma.user.upsert({
                where: {
                    githubId: githubUser.id,
                },
                update: {
                    login: githubUser.login,
                    avatarUrl: githubUser.avatar_url,
                    updatedAt: new Date(),
                },
                create: {
                    githubId: githubUser.id,
                    login: githubUser.login,
                    avatarUrl: githubUser.avatar_url,
                },
            });
            this.logger.log(`User upserted: ${user.login} (ID: ${user.id})`);
            return user;
        }
        catch (error) {
            this.logger.error(`Failed to upsert user: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findByLogin(login) {
        return this.prisma.user.findUnique({
            where: { login },
        });
    }
    async findByGithubId(githubId) {
        return this.prisma.user.findUnique({
            where: { githubId },
        });
    }
    async getUserWithRepoCount(login) {
        const user = await this.findByLogin(login);
        if (!user) {
            return { user: null, repoCount: 0 };
        }
        const repoCount = await this.prisma.repository.count({
            where: { userId: user.id },
        });
        return { user, repoCount };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map