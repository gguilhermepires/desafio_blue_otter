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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoriesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const repositories_service_1 = require("./repositories.service");
const sync_async_response_dto_1 = require("./dto/sync-async-response.dto");
const list_response_dto_1 = require("./dto/list-response.dto");
const search_response_dto_1 = require("./dto/search-response.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const search_dto_1 = require("./dto/search.dto");
const kafka_producer_service_1 = require("../kafka/kafka-producer.service");
const sync_jobs_service_1 = require("../kafka/sync-jobs.service");
let RepositoriesController = class RepositoriesController {
    repositoriesService;
    kafkaProducer;
    syncJobsService;
    constructor(repositoriesService, kafkaProducer, syncJobsService) {
        this.repositoriesService = repositoriesService;
        this.kafkaProducer = kafkaProducer;
        this.syncJobsService = syncJobsService;
    }
    async syncRepositories(username) {
        const syncJob = await this.syncJobsService.createSyncJob(username);
        await this.kafkaProducer.publishSyncRequest({
            jobId: syncJob.jobId,
            username,
            timestamp: Date.now(),
        });
        return {
            jobId: syncJob.jobId,
            username: syncJob.username,
            status: syncJob.status.toLowerCase(),
            createdAt: syncJob.createdAt,
        };
    }
    async getSyncJobStatus(jobId) {
        const syncJob = await this.syncJobsService.getJobById(jobId);
        return {
            jobId: syncJob.jobId,
            username: syncJob.username,
            status: syncJob.status.toLowerCase(),
            repositoriesCount: syncJob.repositoriesCount,
            error: syncJob.error,
            createdAt: syncJob.createdAt,
            completedAt: syncJob.completedAt,
        };
    }
    async listRepositories(username, paginationDto) {
        return this.repositoriesService.listUserRepositories(username, paginationDto);
    }
    async searchRepositories(searchDto) {
        return this.repositoriesService.searchRepositories(searchDto);
    }
};
exports.RepositoriesController = RepositoriesController;
__decorate([
    (0, common_1.Post)('sync/:username'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, swagger_1.ApiOperation)({
        summary: 'Sync GitHub repositories for a user (Async)',
        description: 'Queues a job to fetch and store all public repositories for a GitHub user. Returns immediately with a job ID for status tracking.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'username',
        description: 'GitHub username',
        example: 'octocat',
    }),
    (0, swagger_1.ApiResponse)({
        status: 202,
        description: 'Sync job queued successfully',
        type: sync_async_response_dto_1.SyncAsyncResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Failed to queue sync job',
    }),
    __param(0, (0, common_1.Param)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RepositoriesController.prototype, "syncRepositories", null);
__decorate([
    (0, common_1.Get)('sync/status/:jobId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get sync job status',
        description: 'Retrieves the current status of a repository sync job by its job ID.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'jobId',
        description: 'Job identifier',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Job status retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Job not found',
    }),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RepositoriesController.prototype, "getSyncJobStatus", null);
__decorate([
    (0, common_1.Get)('list/:username'),
    (0, swagger_1.ApiOperation)({
        summary: 'List repositories for a user',
        description: 'Returns paginated list of repositories for a user, ordered by creation date (newest first).',
    }),
    (0, swagger_1.ApiParam)({
        name: 'username',
        description: 'GitHub username',
        example: 'octocat',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        description: 'Page number',
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        description: 'Number of items per page',
        example: 20,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Repositories retrieved successfully',
        type: list_response_dto_1.ListResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'User not found in database',
    }),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], RepositoriesController.prototype, "listRepositories", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search repositories by keywords',
        description: 'Searches repositories by keywords in name, description, and language fields. Supports multiple space-separated keywords with OR logic.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'q',
        description: 'Search keywords (space-separated)',
        example: 'react typescript',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        description: 'Page number',
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        description: 'Number of items per page',
        example: 20,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Search results retrieved successfully',
        type: search_response_dto_1.SearchResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid search query',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SearchDto]),
    __metadata("design:returntype", Promise)
], RepositoriesController.prototype, "searchRepositories", null);
exports.RepositoriesController = RepositoriesController = __decorate([
    (0, swagger_1.ApiTags)('repositories'),
    (0, common_1.Controller)('api/repositories'),
    __metadata("design:paramtypes", [repositories_service_1.RepositoriesService,
        kafka_producer_service_1.KafkaProducerService,
        sync_jobs_service_1.SyncJobsService])
], RepositoriesController);
//# sourceMappingURL=repositories.controller.js.map