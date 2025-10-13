import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LogCleanupService } from './log-cleanup.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [LoggerService, LogCleanupService],
  exports: [LoggerService],
})
export class LoggerModule {}
