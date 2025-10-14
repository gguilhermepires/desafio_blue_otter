import { ApiProperty } from '@nestjs/swagger';

export class SyncAsyncResponseDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  jobId: string;

  @ApiProperty({
    description: 'GitHub username',
    example: 'octocat',
  })
  username: string;

  @ApiProperty({
    description: 'Current job status',
    enum: ['queued', 'processing', 'completed', 'failed'],
    example: 'queued',
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp when job was created',
    example: '2025-01-13T14:30:00.000Z',
  })
  createdAt: Date;
}
