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
exports.StatisticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const statistics_service_1 = require("./statistics.service");
const statistics_dto_1 = require("./dto/statistics.dto");
const statistics_response_dto_1 = require("./dto/statistics-response.dto");
let StatisticsController = class StatisticsController {
    statisticsService;
    constructor(statisticsService) {
        this.statisticsService = statisticsService;
    }
    async getStatistics(statisticsDto) {
        return this.statisticsService.generateStatistics(statisticsDto);
    }
};
exports.StatisticsController = StatisticsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get repository statistics',
        description: 'Calculate and return statistics about repositories. Can be filtered by user or return global statistics. Includes summary counts, language distribution, timeline, and top users.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'user',
        required: false,
        description: 'Filter statistics by username',
        example: 'octocat',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'topN',
        required: false,
        description: 'Number of top users to return (only for global statistics)',
        example: 5,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Statistics calculated successfully',
        type: statistics_response_dto_1.StatisticsResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid query parameters',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [statistics_dto_1.StatisticsDto]),
    __metadata("design:returntype", Promise)
], StatisticsController.prototype, "getStatistics", null);
exports.StatisticsController = StatisticsController = __decorate([
    (0, swagger_1.ApiTags)('statistics'),
    (0, common_1.Controller)('api/statistics'),
    __metadata("design:paramtypes", [statistics_service_1.StatisticsService])
], StatisticsController);
//# sourceMappingURL=statistics.controller.js.map