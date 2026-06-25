import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryMoldMaterialDto extends PaginationDto {
  @IsString()
  @IsOptional()
  typeCode?: string;

  @IsString()
  @IsOptional()
  typeName?: string;
}
