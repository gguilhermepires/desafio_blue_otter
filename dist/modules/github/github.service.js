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
var GithubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let GithubService = GithubService_1 = class GithubService {
    httpService;
    logger = new common_1.Logger(GithubService_1.name);
    baseUrl = 'https://api.github.com';
    timeout = 10000;
    maxRetries = 3;
    constructor(httpService) {
        this.httpService = httpService;
    }
    async fetchUserData(username) {
        const url = `${this.baseUrl}/users/${username}`;
        return this.fetchWithRetry(url);
    }
    async fetchUserRepositories(username) {
        const url = `${this.baseUrl}/users/${username}/repos?per_page=100`;
        const repos = await this.fetchWithRetry(url);
        return repos || [];
    }
    async fetchWithRetry(url, retries = this.maxRetries) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                    timeout: this.timeout,
                    headers: {
                        Accept: 'application/vnd.github.v3+json',
                        'User-Agent': 'NestJS-GitHub-API',
                    },
                }));
                this.checkRateLimit(response);
                return response.data;
            }
            catch (error) {
                const axiosError = error;
                if (axiosError.response?.status === 404) {
                    throw new common_1.NotFoundException('GitHub user not found');
                }
                if (axiosError.response?.status === 429) {
                    const resetTime = axiosError.response.headers['x-ratelimit-reset'];
                    const waitTime = resetTime
                        ? parseInt(resetTime) * 1000 - Date.now()
                        : 60000;
                    this.logger.warn(`GitHub rate limit exceeded. Reset in ${Math.ceil(waitTime / 1000)}s`);
                    throw new common_1.HttpException({
                        statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                        message: 'GitHub API rate limit exceeded',
                        retryAfter: Math.ceil(waitTime / 1000),
                    }, common_1.HttpStatus.TOO_MANY_REQUESTS);
                }
                if (attempt < retries - 1) {
                    const backoffTime = Math.pow(2, attempt) * 1000;
                    this.logger.warn(`Request failed (attempt ${attempt + 1}/${retries}). Retrying in ${backoffTime}ms...`);
                    await this.sleep(backoffTime);
                    continue;
                }
                this.logger.error(`GitHub API request failed after ${retries} attempts: ${axiosError.message}`);
                throw new common_1.BadGatewayException('GitHub API request failed');
            }
        }
        throw new common_1.BadGatewayException('GitHub API request failed');
    }
    checkRateLimit(response) {
        const remaining = response.headers['x-ratelimit-remaining'];
        const limit = response.headers['x-ratelimit-limit'];
        const reset = response.headers['x-ratelimit-reset'];
        if (remaining && parseInt(remaining) < 10) {
            const resetDate = new Date(parseInt(reset) * 1000);
            this.logger.warn(`GitHub API rate limit low: ${remaining}/${limit} requests remaining. Resets at ${resetDate.toISOString()}`);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.GithubService = GithubService;
exports.GithubService = GithubService = GithubService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], GithubService);
//# sourceMappingURL=github.service.js.map