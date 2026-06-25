import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryMoldDto extends PaginationDto {
  @IsString()
  @IsOptional()
  moldCode?: string;

  @IsString()
  @IsOptional()
  phoneName?: string;

  @IsString()
  @IsOptional()
  itemCode?: string;
}
