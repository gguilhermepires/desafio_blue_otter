import { PaginationMetaDto } from '../../../common/dto/pagination.dto';
import { RepositoryDto } from './repository.dto';
export declare class SearchResponseDto {
    data: RepositoryDto[];
    meta: PaginationMetaDto;
}
