import { HttpService } from '@nestjs/axios';
import { Counter, Histogram } from 'prom-client';
import { GitHubUser } from './interfaces/github-user.interface';
import { GitHubRepository } from './interfaces/github-repo.interface';
export declare class GithubService {
    private readonly httpService;
    private readonly githubApiCounter;
    private readonly githubApiDuration;
    private readonly logger;
    private readonly baseUrl;
    private readonly timeout;
    private readonly maxRetries;
    constructor(httpService: HttpService, githubApiCounter: Counter<string>, githubApiDuration: Histogram<string>);
    fetchUserData(username: string): Promise<GitHubUser>;
    fetchUserRepositories(username: string): Promise<GitHubRepository[]>;
    private fetchWithRetry;
    private checkRateLimit;
    private sleep;
}
