import { PrismaService } from '../prisma/prisma.service';
import { GitHubUser } from '../github/interfaces/github-user.interface';
import { User } from '@prisma/client';
export declare class UsersService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    upsertUser(githubUser: GitHubUser): Promise<User>;
    findByLogin(login: string): Promise<User | null>;
    findByGithubId(githubId: number): Promise<User | null>;
    getUserWithRepoCount(login: string): Promise<{
        user: User | null;
        repoCount: number;
    }>;
}
