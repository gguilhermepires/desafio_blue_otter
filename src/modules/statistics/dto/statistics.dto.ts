import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StatisticsDto {
  @ApiPropertyOptional({
    description: 'Filter statistics by username',
    example: 'octocat',
  })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({
    description: 'Number of top users to return (only for global statistics)',
    default: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  topN?: number = 5;
}
