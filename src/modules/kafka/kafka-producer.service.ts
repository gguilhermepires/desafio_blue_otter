import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { SyncRequestEvent, SyncResultEvent } from './dto/sync-event.dto';

export const KAFKA_TOPICS = {
  SYNC_REQUEST: 'repository.sync.request',
  SYNC_RESULT: 'repository.sync.result',
};

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Subscribe to response topics
    const topics = Object.values(KAFKA_TOPICS);
    topics.forEach((topic) => {
      this.kafkaClient.subscribeToResponseOf(topic);
    });

    await this.kafkaClient.connect();
    this.logger.log('Kafka producer connected successfully');
  }

  async publishSyncRequest(event: SyncRequestEvent): Promise<void> {
    try {
      this.kafkaClient.emit(KAFKA_TOPICS.SYNC_REQUEST, event);
      this.logger.log(
        `Published sync request for user ${event.username} with jobId ${event.jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish sync request: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async publishSyncResult(event: SyncResultEvent): Promise<void> {
    try {
      this.kafkaClient.emit(KAFKA_TOPICS.SYNC_RESULT, event);
      this.logger.log(
        `Published sync result for jobId ${event.jobId} with status ${event.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish sync result: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
