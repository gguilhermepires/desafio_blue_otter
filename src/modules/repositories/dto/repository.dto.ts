import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RepositoryDto {
  @ApiProperty({
    description: 'Internal database ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'GitHub repository ID',
    example: 123456789,
  })
  githubId: number;

  @ApiProperty({
    description: 'Repository name',
    example: 'awesome-project',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Repository description',
    example: 'An awesome project that does amazing things',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Repository URL',
    example: 'https://github.com/octocat/awesome-project',
  })
  url: string;

  @ApiPropertyOptional({
    description: 'Primary programming language',
    example: 'TypeScript',
    nullable: true,
  })
  language: string | null;

  @ApiProperty({
    description: 'Repository creation date on GitHub',
    example: '2025-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp in our database',
    example: '2025-10-11T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'User ID who owns this repository',
    example: 1,
  })
  userId: number;
}
