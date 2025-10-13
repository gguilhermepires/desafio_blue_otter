import { Module } from '@nestjs/common';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GithubModule } from '../github/github.module';
import { UsersModule } from '../users/users.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [PrismaModule, GithubModule, UsersModule, MetricsModule],
  controllers: [RepositoriesController],
  providers: [RepositoriesService],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
