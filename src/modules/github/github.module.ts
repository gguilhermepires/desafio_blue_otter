import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GithubService } from './github.service';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [HttpModule, MetricsModule],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
