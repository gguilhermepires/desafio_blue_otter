import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RepositoriesService } from '../repositories/repositories.service';
import { SyncJobsService } from './sync-jobs.service';
import { KafkaProducerService, KAFKA_TOPICS } from './kafka-producer.service';
import { SyncRequestEvent, SyncJobStatus } from './dto/sync-event.dto';
import { SyncJobStatus as PrismaSyncJobStatus } from '@prisma/client';

@Controller()
export class KafkaConsumerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaConsumerService.name);

  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly syncJobsService: SyncJobsService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  onModuleInit() {
    this.logger.log('Kafka consumer service initialized');
  }

  @MessagePattern(KAFKA_TOPICS.SYNC_REQUEST)
  async handleSyncRequest(@Payload() event: SyncRequestEvent): Promise<void> {
    this.logger.log(
      `Received sync request for user ${event.username} (jobId: ${event.jobId})`,
    );

    try {
      // Update job status to PROCESSING
      await this.syncJobsService.updateJobStatus(
        event.jobId,
        PrismaSyncJobStatus.PROCESSING,
      );

      // Execute the actual sync operation
      const result =
        await this.repositoriesService.syncUserRepositories(event.username);

      // Update job status to COMPLETED
      await this.syncJobsService.updateJobStatus(
        event.jobId,
        PrismaSyncJobStatus.COMPLETED,
        result.count,
      );

      // Publish result event
      await this.kafkaProducer.publishSyncResult({
        jobId: event.jobId,
        username: event.username,
        status: SyncJobStatus.COMPLETED,
        repositoriesCount: result.count,
        timestamp: Date.now(),
      });

      this.logger.log(
        `Successfully completed sync for user ${event.username} (${result.count} repos)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync repositories for user ${event.username}: ${error.message}`,
        error.stack,
      );

      // Update job status to FAILED
      await this.syncJobsService.updateJobStatus(
        event.jobId,
        PrismaSyncJobStatus.FAILED,
        undefined,
        error.message,
      );

      // Publish failure result event
      await this.kafkaProducer.publishSyncResult({
        jobId: event.jobId,
        username: event.username,
        status: SyncJobStatus.FAILED,
        error: error.message,
        timestamp: Date.now(),
      });
    }
  }
}
