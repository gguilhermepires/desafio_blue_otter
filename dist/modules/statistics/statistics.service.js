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
var StatisticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let StatisticsService = StatisticsService_1 = class StatisticsService {
    prisma;
    logger = new common_1.Logger(StatisticsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateStatistics(statsDto) {
        const { user, topN = 5 } = statsDto;
        const filter = user
            ? {
                user: {
                    login: user,
                },
            }
            : {};
        const [totalRepos, totalUsers, languageStats, topUsers, timelineData] = await Promise.all([
            this.prisma.repository.count({ where: filter }),
            user ? Promise.resolve(null) : this.prisma.user.count(),
            this.getLanguageStatistics(filter),
            user ? Promise.resolve(null) : this.getTopUsers(topN),
            this.getTimelineStatistics(filter),
        ]);
        const summary = {
            total_repos: totalRepos,
        };
        if (!user && totalUsers !== null) {
            summary.total_users = totalUsers;
        }
        const response = {
            summary,
            languages: languageStats,
            timeline_created_monthly: timelineData,
        };
        if (!user && topUsers) {
            response.top_users_by_repos = topUsers;
        }
        return response;
    }
    async getLanguageStatistics(filter) {
        const languageGroups = await this.prisma.repository.groupBy({
            by: ['language'],
            where: filter,
            _count: {
                language: true,
            },
        });
        const languages = {};
        for (const group of languageGroups) {
            const key = group.language || 'null';
            languages[key] = group._count.language;
        }
        return languages;
    }
    async getTopUsers(topN) {
        const userGroups = await this.prisma.repository.groupBy({
            by: ['userId'],
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: topN,
        });
        const userIds = userGroups.map((g) => g.userId);
        const users = await this.prisma.user.findMany({
            where: {
                id: {
                    in: userIds,
                },
            },
            select: {
                id: true,
                login: true,
            },
        });
        const userMap = new Map(users.map((u) => [u.id, u.login]));
        return userGroups.map((group) => ({
            login: userMap.get(group.userId) || 'unknown',
            count: group._count.id,
        }));
    }
    async getTimelineStatistics(filter) {
        const repositories = await this.prisma.repository.findMany({
            where: filter,
            select: {
                createdAt: true,
            },
        });
        const monthCounts = {};
        for (const repo of repositories) {
            const monthKey = this.formatYearMonth(repo.createdAt);
            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        }
        if (repositories.length > 0) {
            return this.fillMissingMonths(monthCounts);
        }
        return monthCounts;
    }
    formatYearMonth(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    fillMissingMonths(monthCounts) {
        const months = Object.keys(monthCounts).sort();
        if (months.length === 0) {
            return monthCounts;
        }
        const firstMonth = months[0];
        const lastMonth = months[months.length - 1];
        const [firstYear, firstMonthNum] = firstMonth.split('-').map(Number);
        const [lastYear, lastMonthNum] = lastMonth.split('-').map(Number);
        const result = {};
        let currentYear = firstYear;
        let currentMonth = firstMonthNum;
        while (currentYear < lastYear ||
            (currentYear === lastYear && currentMonth <= lastMonthNum)) {
            const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            result[monthKey] = monthCounts[monthKey] || 0;
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }
        return result;
    }
};
exports.StatisticsService = StatisticsService;
exports.StatisticsService = StatisticsService = StatisticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatisticsService);
//# sourceMappingURL=statistics.service.js.map