import { ApiProperty } from '@nestjs/swagger';

export class SyncResponseDto {
  @ApiProperty({
    description: 'Number of repositories synchronized',
    example: 42,
  })
  count: number;

  @ApiProperty({
    description: 'Timestamp of synchronization',
    example: '2025-10-11T10:30:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Username synchronized',
    example: 'octocat',
  })
  username: string;
}
