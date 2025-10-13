"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoriesModule = void 0;
const common_1 = require("@nestjs/common");
const repositories_controller_1 = require("./repositories.controller");
const repositories_service_1 = require("./repositories.service");
const prisma_module_1 = require("../prisma/prisma.module");
const github_module_1 = require("../github/github.module");
const users_module_1 = require("../users/users.module");
let RepositoriesModule = class RepositoriesModule {
};
exports.RepositoriesModule = RepositoriesModule;
exports.RepositoriesModule = RepositoriesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, github_module_1.GithubModule, users_module_1.UsersModule],
        controllers: [repositories_controller_1.RepositoriesController],
        providers: [repositories_service_1.RepositoriesService],
        exports: [repositories_service_1.RepositoriesService],
    })
], RepositoriesModule);
//# sourceMappingURL=repositories.module.js.map