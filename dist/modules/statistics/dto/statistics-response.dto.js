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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsResponseDto = exports.TopUserDto = exports.SummaryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class SummaryDto {
    total_repos;
    total_users;
}
exports.SummaryDto = SummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total number of repositories',
        example: 1234,
    }),
    __metadata("design:type", Number)
], SummaryDto.prototype, "total_repos", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Total number of users (only for global statistics)',
        example: 42,
    }),
    __metadata("design:type", Number)
], SummaryDto.prototype, "total_users", void 0);
class TopUserDto {
    login;
    count;
}
exports.TopUserDto = TopUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User login',
        example: 'octocat',
    }),
    __metadata("design:type", String)
], TopUserDto.prototype, "login", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of repositories',
        example: 125,
    }),
    __metadata("design:type", Number)
], TopUserDto.prototype, "count", void 0);
class StatisticsResponseDto {
    summary;
    languages;
    top_users_by_repos;
    timeline_created_monthly;
}
exports.StatisticsResponseDto = StatisticsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Summary statistics',
        type: SummaryDto,
    }),
    __metadata("design:type", SummaryDto)
], StatisticsResponseDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Repository count by programming language',
        example: {
            TypeScript: 45,
            JavaScript: 32,
            Python: 28,
            Go: 15,
            null: 5,
        },
    }),
    __metadata("design:type", Object)
], StatisticsResponseDto.prototype, "languages", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Top users by repository count (only for global statistics)',
        type: [TopUserDto],
    }),
    __metadata("design:type", Array)
], StatisticsResponseDto.prototype, "top_users_by_repos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Timeline of repository creation by month',
        example: {
            '2025-01': 12,
            '2025-02': 18,
            '2025-03': 15,
        },
    }),
    __metadata("design:type", Object)
], StatisticsResponseDto.prototype, "timeline_created_monthly", void 0);
//# sourceMappingURL=statistics-response.dto.js.map