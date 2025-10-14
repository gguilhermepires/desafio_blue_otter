import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { SyncJobsService } from './sync-jobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => RepositoriesModule),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'github-api',
              brokers: [
                configService.get<string>(
                  'KAFKA_BROKER',
                  'localhost:9092',
                ),
              ],
            },
            consumer: {
              groupId: 'github-api-consumer',
              allowAutoTopicCreation: true,
            },
            producer: {
              allowAutoTopicCreation: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [KafkaConsumerService],
  providers: [KafkaProducerService, KafkaConsumerService, SyncJobsService],
  exports: [KafkaProducerService, SyncJobsService, ClientsModule],
})
export class KafkaModule {}
