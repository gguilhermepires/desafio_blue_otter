import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination.dto';
import { RepositoryDto } from './repository.dto';

export class SearchResponseDto {
  @ApiProperty({
    description: 'Array of matching repositories',
    type: [RepositoryDto],
  })
  data: RepositoryDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
