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
exports.ListResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const pagination_dto_1 = require("../../../common/dto/pagination.dto");
const repository_dto_1 = require("./repository.dto");
class ListResponseDto {
    data;
    meta;
}
exports.ListResponseDto = ListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array of repositories',
        type: [repository_dto_1.RepositoryDto],
    }),
    __metadata("design:type", Array)
], ListResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Pagination metadata',
        type: pagination_dto_1.PaginationMetaDto,
    }),
    __metadata("design:type", pagination_dto_1.PaginationMetaDto)
], ListResponseDto.prototype, "meta", void 0);
//# sourceMappingURL=list-response.dto.js.map