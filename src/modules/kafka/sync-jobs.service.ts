import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncJob, SyncJobStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SyncJobsService {
  private readonly logger = new Logger(SyncJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new sync job in QUEUED status
   */
  async createSyncJob(username: string): Promise<SyncJob> {
    const jobId = uuidv4();

    const syncJob = await this.prisma.syncJob.create({
      data: {
        jobId,
        username,
        status: SyncJobStatus.QUEUED,
      },
    });

    this.logger.log(`Created sync job ${jobId} for user ${username}`);
    return syncJob;
  }

  /**
   * Update sync job status
   */
  async updateJobStatus(
    jobId: string,
    status: SyncJobStatus,
    repositoriesCount?: number,
    error?: string,
  ): Promise<SyncJob> {
    const updateData: any = {
      status,
    };

    if (repositoriesCount !== undefined) {
      updateData.repositoriesCount = repositoriesCount;
    }

    if (error !== undefined) {
      updateData.error = error;
    }

    if (status === SyncJobStatus.COMPLETED || status === SyncJobStatus.FAILED) {
      updateData.completedAt = new Date();
    }

    const syncJob = await this.prisma.syncJob.update({
      where: { jobId },
      data: updateData,
    });

    this.logger.log(`Updated sync job ${jobId} to status ${status}`);
    return syncJob;
  }

  /**
   * Get sync job by ID
   */
  async getJobById(jobId: string): Promise<SyncJob> {
    const syncJob = await this.prisma.syncJob.findUnique({
      where: { jobId },
    });

    if (!syncJob) {
      throw new NotFoundException(`Sync job ${jobId} not found`);
    }

    return syncJob;
  }

  /**
   * Get all sync jobs for a user
   */
  async getJobsByUsername(username: string): Promise<SyncJob[]> {
    return this.prisma.syncJob.findMany({
      where: { username },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get recent sync jobs (last 100)
   */
  async getRecentJobs(limit = 100): Promise<SyncJob[]> {
    return this.prisma.syncJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Delete old completed/failed jobs (older than specified days)
   */
  async cleanupOldJobs(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.syncJob.deleteMany({
      where: {
        completedAt: {
          lt: cutoffDate,
        },
        status: {
          in: [SyncJobStatus.COMPLETED, SyncJobStatus.FAILED],
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old sync jobs`);
    return result.count;
  }
}
