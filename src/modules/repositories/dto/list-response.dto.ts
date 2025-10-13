import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination.dto';
import { RepositoryDto } from './repository.dto';

export class ListResponseDto {
  @ApiProperty({
    description: 'Array of repositories',
    type: [RepositoryDto],
  })
  data: RepositoryDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
