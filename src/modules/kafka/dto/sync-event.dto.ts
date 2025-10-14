import { IsString, IsUUID, IsEnum, IsOptional, IsNumber } from 'class-validator';

export enum SyncJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class SyncRequestEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  username: string;

  @IsNumber()
  timestamp: number;
}

export class SyncResultEvent {
  @IsUUID()
  jobId: string;

  @IsString()
  username: string;

  @IsEnum(SyncJobStatus)
  status: SyncJobStatus;

  @IsOptional()
  @IsNumber()
  repositoriesCount?: number;

  @IsOptional()
  @IsString()
  error?: string;

  @IsNumber()
  timestamp: number;
}

export interface SyncJobResult {
  count: number;
  username: string;
  timestamp: Date;
}
