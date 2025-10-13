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
exports.RepositoryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class RepositoryDto {
    id;
    githubId;
    name;
    description;
    url;
    language;
    createdAt;
    updatedAt;
    userId;
}
exports.RepositoryDto = RepositoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Internal database ID',
        example: 1,
    }),
    __metadata("design:type", Number)
], RepositoryDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'GitHub repository ID',
        example: 123456789,
    }),
    __metadata("design:type", Number)
], RepositoryDto.prototype, "githubId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Repository name',
        example: 'awesome-project',
    }),
    __metadata("design:type", String)
], RepositoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Repository description',
        example: 'An awesome project that does amazing things',
        nullable: true,
    }),
    __metadata("design:type", Object)
], RepositoryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Repository URL',
        example: 'https://github.com/octocat/awesome-project',
    }),
    __metadata("design:type", String)
], RepositoryDto.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Primary programming language',
        example: 'TypeScript',
        nullable: true,
    }),
    __metadata("design:type", Object)
], RepositoryDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Repository creation date on GitHub',
        example: '2025-01-15T10:30:00.000Z',
    }),
    __metadata("design:type", Date)
], RepositoryDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last update timestamp in our database',
        example: '2025-10-11T10:30:00.000Z',
    }),
    __metadata("design:type", Date)
], RepositoryDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID who owns this repository',
        example: 1,
    }),
    __metadata("design:type", Number)
], RepositoryDto.prototype, "userId", void 0);
//# sourceMappingURL=repository.dto.js.map