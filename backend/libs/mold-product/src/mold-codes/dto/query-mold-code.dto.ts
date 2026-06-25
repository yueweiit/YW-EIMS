import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryMoldCodeDto extends PaginationDto {
  @IsString()
  @IsOptional()
  moldCode?: string;

  @IsString()
  @IsOptional()
  moldType?: string;

  @IsString()
  @IsOptional()
  typeCode?: string;
}
