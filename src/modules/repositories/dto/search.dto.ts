import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SearchDto extends PaginationDto {
  @ApiProperty({
    description: 'Search keywords (space-separated for multiple keywords)',
    example: 'react typescript',
  })
  @IsNotEmpty()
  @IsString()
  q: string;
}
